import {
  Event,
  extractEventInfo as extractGeneralEventInfo,
} from "./akc-event-api.ts";
import {
  extractClassInfo,
  extractEntriesInfo,
  extractJudgeInfo,
  isTrialRow,
} from "./event-page.ts";

import { dogs, runs } from "./db.ts";

import { extractDogInfo, extractPointsInfo } from "./placement-page.ts";

import {
  DOMParser,
  Element,
  initParser,
} from "https://deno.land/x/deno_dom/deno-dom-wasm-noinit.ts";
import { PromisePool } from "https://cdn.skypack.dev/@supercharge/promise-pool?dts";
import { Bson } from "https://deno.land/x/mongo/mod.ts";
import { logger } from "./logging.ts";

const START_YEAR = 2021;
const START_MONTH = 0; // January
const START_DAY = 1;
const START_DATE = new Date(START_YEAR, START_MONTH, START_DAY);
const DOMAIN = "https://www.apps.akc.org";
const EVENT_CONCURRENCY = 10;
const PLACEMENT_CONCURRENCY = 10;

interface CompetitionEntry {
  runName: string;
  className: string | null;
  division: string | null;
  classHref: string;
  height: number | null;
  judge: {
    name: string;
    href: string;
  };
  numEntries: number;
  standardCompletionTime: number | null;
  numYards: number | null;
}

/**
 * Constructs an array of intervals starting at the given start date and ending at the given end date.
 * This function attempts to construct 1 month intervals. However, if a month interval exceeds the given
 * end date, this function will truncate the last interval so that it ends on the given end date.
 * @param intervalStartDate The beginning of the date interval
 * @param intervalEndDate The end of the date interval
 * @returns An array of string tuples, where the first entry is the start date and the second is the end date, both in mm-dd-yyyy format.
 */
const monthlyIntervals = (
  intervalStartDate: Date,
  intervalEndDate: Date,
): Array<[string, string]> => {
  let startDate = new Date(intervalStartDate);
  const dates: [string, string][] = [];
  const usDateTimeFormatter = Intl.DateTimeFormat("en-US");
  while (startDate < intervalEndDate) {
    const tempDate = new Date(startDate);
    let endDate = new Date(tempDate.setMonth(tempDate.getMonth() + 1));
    if (endDate > intervalEndDate) {
      endDate = intervalEndDate;
    }
    const formattedStartDate = usDateTimeFormatter.format(startDate);
    const formattedEndDate = usDateTimeFormatter.format(endDate);
    dates.push([formattedStartDate, formattedEndDate]);
    startDate = endDate;
  }
  return dates;
};

/**
 * Adds placement information to a competition entry: which dogs won, their scores, breeds, handlers, names, IDs
 * @param entry A competition entry
 * @returns The competition entry with additional data about how dogs placed in the competition
 */
const addPlacementDetails = async (entry: CompetitionEntry) => {
  const detailsPageUrl = entry.classHref;
  const detailsPageHtml = await fetch(detailsPageUrl).then((response) =>
    response.text()
  );
  const document = new DOMParser().parseFromString(
    detailsPageHtml,
    "text/html",
  );
  if (!document) {
    logger.warning(`Could not read HTML response of ${detailsPageUrl}`);
    return;
  }
  const fontTags = document.querySelectorAll(
    'td[align="right"] > font',
  );
  if (!fontTags) {
    logger.warning(`Could not find font tags on ${detailsPageUrl}`);
    return;
  }
  const detailsData = Array.from(fontTags).map((fontTag) => {
    const parentRow = fontTag.parentElement!.parentElement!;
    const [_a, _b, _c, placeCell, dogCell, pointsCell] = parentRow.children;
    const { dogBreed, dogHandler, registeredName, akcRegistrationNumber } =
      extractDogInfo(
        dogCell,
      );
    const { points, time } = extractPointsInfo(pointsCell);
    const placeStr = placeCell.innerText.replace(/\s+/g, " ").trim();
    const place = placeStr.match(/\d+/g)?.[0] || null;
    return {
      place,
      dogBreed,
      dogHandler,
      registeredName,
      akcRegistrationNumber,
      points,
      time,
    };
  });
  const finalEntry = { ...entry, placements: detailsData };
  return finalEntry;
};

const extractCompetitionInfoForEvent = async (
  eventAndClubInfo: {
    eventNumber: string;
    eventName: string;
    clubName: string;
    startDate: Date;
    endDate: Date;
  },
) => {
  const url =
    `${DOMAIN}/apps/events/search/index_results.cfm?action=plan&event_number=${eventAndClubInfo.eventNumber}&get_event_by_number=yes&NEW_END_DATE1=`;
  logger.debug("Fetching HTML", url);
  const html = await fetch(url).then((response) => response.text());

  // Write the text file locally, for debugging purposes.
  await Deno.writeTextFile(
    `outputs/${eventAndClubInfo.eventNumber}.html`,
    html,
  );

  // Parse the text we got back from the server, and if it isn't valid HTML, move on.
  const document = new DOMParser().parseFromString(html, "text/html");
  if (!document) {
    logger.warning(`Cannot parse HTML, skipping.`, url);
    return;
  }

  // Find all of the table rows that are actually a competition, or end early if we can't find any.
  const competitionRows = document.querySelectorAll(
    "html body table tbody tr td div font table tbody tr",
  );
  if (!competitionRows) {
    logger.warning(`Could not find competition rows`, url);
    return;
  }
  // Filter out any rows that don't belong to competition trials.
  const filteredRows = Array.from(competitionRows).filter(isTrialRow);
  logger.debug(
    `Initially captured ${competitionRows.length} rows, filtered down to ${filteredRows.length} rows`,
    url,
  );

  const competitionData = filteredRows.map((row) => {
    const [_, eventCell, judgeCell, entriesCell] = Array.from(
      (row as Element).children,
    );
    const entriesInfo = extractEntriesInfo(entriesCell);
    const judgeInfo = extractJudgeInfo(judgeCell);
    const classInfo = extractClassInfo(eventCell);
    if (!entriesInfo || !judgeInfo || !classInfo) {
      // We're only interested in competitions where all the cells are valid
      // (i.e. there was a judge, there were entries, and there was class information)
      logger.debug(
        `A row was missing required information, skipping`,
        url,
        JSON.stringify(classInfo),
        JSON.stringify(judgeInfo),
        JSON.stringify(entriesInfo),
      );
      return;
    }
    const { judgeName, judgeHref } = judgeInfo;
    const { runName, className, division, classHref, height } = classInfo;
    const competitionEntry: CompetitionEntry = {
      runName,
      className,
      division,
      classHref: `${DOMAIN}${classHref}`,
      height,
      judge: {
        name: judgeName,
        href: `${DOMAIN}${judgeHref}`,
      },
      ...entriesInfo,
    };
    return competitionEntry;
  }).filter((entry): entry is CompetitionEntry =>
    !!entry && entry.standardCompletionTime !== null && entry.numYards !== null
  );
  logger.info(
    `Successfully got data for ${competitionData.length} competitions`,
    url,
  );
  const { results, errors } = await PromisePool.withConcurrency(
    PLACEMENT_CONCURRENCY,
  )
    .for(
      competitionData,
    ).process(addPlacementDetails);
  logger.info("Finished adding placement details to the competitions", url);
  for (const error of errors) {
    logger.error(error.message, url);
  }
  for (const result of results) {
    if (!result) {
      continue;
    }
    for (const place of result.placements) {
      const matchingDog = await dogs.findOne({
        AKCnum: place.akcRegistrationNumber,
      });
      let dogId: Bson.ObjectId;
      if (!matchingDog) {
        logger.debug(
          "Could not find a dog with AKC registration number",
          place.akcRegistrationNumber,
          result.classHref,
        );
        dogId = await dogs.insertOne({
          Name: place.registeredName,
          AKCnum: place.akcRegistrationNumber,
        });
      } else {
        dogId = matchingDog._id;
      }
      const runCriteria = {
        Dog: dogId,
        CurrentDate: eventAndClubInfo.startDate,
        Division: result.division,
        Class: result.className,
        Height: result.height?.toString(),
        Judge: result.judge.name,
        Place: place.place ? parseInt(place.place) : null,
        SCT: result.standardCompletionTime,
        Yards: result.numYards,
      };
      const matchingRun = await runs.findOne(runCriteria);
      if (!matchingRun) {
        logger.debug(
          "Could not find a run matching run criteria, inserting",
          result.classHref,
          JSON.stringify(runCriteria),
        );
        await runs.insertOne(runCriteria);
      }
    }
  }
  return Deno.writeTextFile(
    `outputs/${eventAndClubInfo.eventNumber}.json`,
    JSON.stringify(results),
  );
};

const main = async () => {
  const today = new Date();
  logger.debug("Initializing HTML parser...");
  await initParser();
  for (const [start, end] of monthlyIntervals(START_DATE, today)) {
    const results = await fetch(
      "https://webapps.akc.org/event-search/api/search/events",
      {
        "credentials": "include",
        "headers": {
          "User-Agent":
            "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:94.0) Gecko/20100101 Firefox/94.0",
          "Accept": "application/json",
          "Accept-Language": "en-US,en;q=0.5",
          "Content-Type": "application/json",
          "x-csrf-token": "token",
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors",
          "Sec-Fetch-Site": "same-origin",
        },
        "referrer": "https://webapps.akc.org/event-search/",
        "body": JSON.stringify(
          {
            "address": {
              "eventSetting": {
                "indoor": true,
                "outdoor": true,
                "outsideCovered": true,
              },
              "location": {
                "cityState": "",
                "latitude": 0,
                "longitude": 0,
                "zipCode": null,
              },
              "radius": "any",
              "searchByState": false,
              "searchByCity": false,
              "searchText": "All Cities & States",
            },
            "breedCode": "4444",
            "breedName": "All-American Dogs",
            "breedId": "ALL_AMERICAN",
            "dateRange": {
              "from": start,
              "to": end,
              "type": "event",
            },
            "competition": {
              "items": [{
                "selected": true,
                "value": { "compType": "AG" },
                "label": "Agility (AG)",
              }],
              "filters": [],
            },
          },
        ),
        "method": "POST",
        "mode": "cors",
      },
    ).then((response) => response.json());
    const extractedFilteredEvents = (results.events as Event[]).map(
      extractGeneralEventInfo,
    ).filter((event) => event.endDate < today);
    logger.info(
      `Scraping ${extractedFilteredEvents.length} events between ${start} and ${end}.`,
    );
    const { errors } = await PromisePool.withConcurrency(EVENT_CONCURRENCY).for(
      extractedFilteredEvents,
    ).process(extractCompetitionInfoForEvent);
    for (const error of errors) {
      console.error(error);
    }
  }
};

main();
