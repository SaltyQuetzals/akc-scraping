import {
  Event,
  extractEventInfo as extractGeneralEventInfo,
} from "./akc-event-api.ts";
import {
  extractClassInfo,
  extractEntriesInfo,
  extractJudgeInfo,
} from "./event-page.ts";

import { extractDogInfo, extractPointsInfo } from "./placement-page.ts";

import {
  DOMParser,
  Element,
  initParser,
} from "https://deno.land/x/deno_dom/deno-dom-wasm-noinit.ts";
import { PromisePool } from "https://cdn.skypack.dev/@supercharge/promise-pool?dts";

const START_YEAR = 2021;
const START_MONTH = 0; // January
const START_DAY = 1;
const START_DATE = new Date(START_YEAR, START_MONTH, START_DAY);
const DOMAIN = "https://www.apps.akc.org";

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
  console.log(url);
  const html = await fetch(url).then((response) => response.text());
  await Deno.writeTextFile(
    `outputs/${eventAndClubInfo.eventNumber}.html`,
    html,
  );
  const document = new DOMParser().parseFromString(html, "text/html");
  if (!document) {
    console.log(`Cannot parse html for ${url}.`);
    return;
  }
  const competitionRows = document.querySelectorAll(
    "html body table tbody tr td div font table tbody tr",
  );
  if (!competitionRows) {
    console.log(`Could not find competition rows for ${url}`);
    return;
  }
  const filteredRows = Array.from(competitionRows).filter((value) => {
    const elem = value as Element;
    if (elem.children.length !== 4) {
      return false;
    }
    const firstChild = elem.children[1];
    return firstChild.hasAttribute("colspan") &&
      firstChild.getAttribute("colspan") === "4";
  });
  console.log(
    `Initially captured ${competitionRows.length} rows, filtered down to ${filteredRows.length} rows.`,
  );
  const competitionData = [];
  for (const row of filteredRows) {
    const [_, eventCell, judgeCell, entriesCell] = Array.from(
      (row as Element).children,
    );
    const entriesInfo = extractEntriesInfo(entriesCell);
    const judgeInfo = extractJudgeInfo(judgeCell);
    const classInfo = extractClassInfo(eventCell);
    if (!entriesInfo || !judgeInfo || !classInfo) {
      // We're only interested in competitions where there were entries.
      return;
    }
    const { judgeName, judgeHref } = judgeInfo;
    const { className, classHref } = classInfo;
    const { numEntries, standardCompletionTime, numYards } = entriesInfo;
    const competitionEntry = {
      className,
      classHref: `${DOMAIN}${classHref}`,
      judge: {
        name: judgeName,
        href: `${DOMAIN}${judgeHref}`,
      },
      numEntries,
      standardCompletionTime,
      numYards,
    };
    competitionData.push(competitionEntry);
  }
  const filteredCompetitionData = competitionData.filter(
    (x) => x.standardCompletionTime !== null && x.numYards !== null,
  );
  const { results, errors } = await PromisePool.withConcurrency(10).for(
    filteredCompetitionData,
  ).process(async (competition) => {
    const detailsPageUrl = competition!.classHref;
    const detailsPageHtml = await fetch(detailsPageUrl).then((response) =>
      response.text()
    );
    const document = new DOMParser().parseFromString(
      detailsPageHtml,
      "text/html",
    );
    if (!document) {
      console.error(`Could not read HTML response of ${detailsPageUrl}`);
      return;
    }
    const detailsFontTags = document.querySelectorAll(
      'td[align="right"] > font',
    );
    if (!detailsFontTags) {
      console.error(`Could not find Font tags on ${detailsPageUrl}`);
      return;
    }
    const detailsData = [];
    for (const detailsFontTag of detailsFontTags) {
      const parentRow = detailsFontTag.parentElement!.parentElement!;
      const [_a, _b, _c, placeCell, dogCell, pointsCell] = parentRow.children;
      const place = placeCell.innerText.replace(/\s+/g, " ").trim();
      const { dogBreed, dogHandler, dogName, dogId } = extractDogInfo(
        dogCell,
      );
      const { points, time } = extractPointsInfo(pointsCell);
      detailsData.push({
        place,
        dogBreed,
        dogHandler,
        dogName,
        dogId,
        points,
        time,
      });
    }
    const finalEntry = { ...competition, placements: detailsData };
    return finalEntry;
  });
  for (const error of errors) {
    console.error(`${url}: ${error.item}`);
  }
  return Deno.writeTextFile(
    `outputs/${eventAndClubInfo.eventNumber}.json`,
    JSON.stringify(results),
  );
};

const main = async () => {
  const today = new Date();
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
    console.log(
      `Received a total of ${results.events.length} events between ${start} and ${end}.`,
    );
    const extractedFilteredEvents = (results.events as Event[]).map(
      extractGeneralEventInfo,
    ).filter((event) => event.endDate < today);
    console.log(
      `Going to extract data for ${extractedFilteredEvents.length} events.`,
    );
    await initParser();
    const { errors } = await PromisePool.withConcurrency(10).for(
      extractedFilteredEvents,
    ).process(extractCompetitionInfoForEvent);
    for (const error of errors) {
      console.error(error);
    }
  }
};

main();
