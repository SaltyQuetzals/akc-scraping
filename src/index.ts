import PromisePool = require("@supercharge/promise-pool/dist");
import axios from "axios";
import * as cheerio from "cheerio";
import { writeFileSync } from "fs";
/**
 * Parses a competition class cell.
 * @param classCell The <td> tag containing a competition class anchor.
 * @returns The name of the competition class, and a path to its placement data.
 */
const extractClassInfo = (classCell: cheerio.Element) => {
  const $ = cheerio.load(classCell);
  const classLink = $("a.white");
  const className = classLink.text();
  // The AKC page uses some kind of framework for opening links with JavaScript, but since we're interacting with HTML,
  // let's just parse out the path from the JavaScript code in the "href" attribute of the class link.
  const classHref =
    /openWin\('(?<href>[^']+)/g.exec(classLink.attr("href")!)!.groups!.href;
  return { className, classHref };
};

/**
 * Parses a judge cell.
 * @param judgeCell The <td> tag containing a judge anchor.
 * @returns The name of the judge, as well as a path to the judge's information.
 */
const extractJudgeInfo = (judgeCell: cheerio.Element) => {
  const $ = cheerio.load(judgeCell);
  const judgeLink = $("a.white");
  const judgeName = $.text().replace(/\s+/g, " ").trim();
  const judgeHref = judgeLink.attr("href");
  return { judgeName, judgeHref };
};

/**
 * Parses an entries cell.
 * @param entriesCell The <td> containing info about the number of entries in a competition
 * @returns The number of entries, the standard completion time (SCT), and the distance of the course.
 */
const extractEntriesInfo = (entriesCell: cheerio.Element) => {
  const $ = cheerio.load(entriesCell);
  const entriesData = $.text().replace(
    /\s+/g,
    " ",
  ).trim();
  if (!entriesData) {
    console.log("Entries data doesn't match:", $.text());
    console.log($.text());
    return;
  }
  // Matches:
  // (2ent) -> {entries: 2}
  // (14 ent) 30 Secs -> {entries: 14, seconds: 30, yards: }
  // (13 ent) 20.5 Secs 100 yds -> {entries: 13, seconds: 20.5, yards: 100}
  // The regex ignores the whitespace in between each token, and will match only the parts that are present.
  const entriesAndSecondsAndYardsRegex =
    /(?<entries>\d+)\s*ent\)(\s*(?<seconds>[\d\.]+)\s*Sec(\s*(?<yards>[\d\.]+)\s*yds)?)?/gim;
  let matches = entriesAndSecondsAndYardsRegex.exec(entriesData);

  // If we didn't match the entries data at all, or there aren't any match groups, return nothing.
  if (!matches || !matches.groups) {
    return;
  }

  let numEntries: number = parseInt(matches.groups.entries);
  let standardCompletionTime: number | null = null;
  let numYards: number | null = null;
  if (matches.groups.seconds) {
    standardCompletionTime = parseFloat(matches.groups.seconds);
  }
  if (matches.groups.yards) {
    numYards = parseInt(matches.groups.yards);
  }
  return { numEntries, standardCompletionTime, numYards };
};

const extractDogInfo = (dogCell: cheerio.Element) => {
  const $ = cheerio.load(dogCell);
  const dogLink = $("a.white");
  const dogCellTextContent = $(dogCell).text();
  const dogBreed = $($("i")[0]).text()
    .replace(/\s+/g, " ");
  const dogHandler = dogCellTextContent.slice(
    dogCellTextContent.indexOf(dogBreed) + dogBreed?.length,
  ).trim(); // The handler information immediately follows the dog's breed, so just slice the string from the end of the dog breed substring.
  const dogName = $(dogLink).text().replace(/\s+/g, " ").trim()!;
  // The ID of the dog is buried in the href of the dog link, so parse the URL and extract the query parameter matching the ID.
  const dogId = new URL(`https://www.apps.akc.org${dogLink.attr("href")}`)
    .searchParams.get("dog_id")!;
  return { dogHandler, dogName, dogBreed, dogId };
};

/**
 * Parses a points cell.
 * @param pointsCell The <td> containing info about the performance of a dog that placed during the competition.
 * @returns The number of points the dog scored, as well as what time they achieved.
 */
const extractPointsInfo = (pointsCell: cheerio.Element) => {
  const $ = cheerio.load(pointsCell);
  const pointsCellTextContent = $(pointsCell).text().replace(/\s/g, " ").trim();
  const match = /(?:pts\s+(?<points>[\d\.]+)\s+)?(?:Time\s+(?<time>[\d\.]+))?/g
    .exec(pointsCellTextContent);
  return {
    points: parseFloat(match?.groups!.points!),
    time: parseFloat(match?.groups!.time!),
  };
};

const main = async (eventNumber: string) => {
  const url =
    `https://www.apps.akc.org/apps/events/search/index_results.cfm?action=plan&event_number=${eventNumber}&get_event_by_number=yes&NEW_END_DATE1=`;
  console.log(url);
  const html = await axios.get(url).then((response) => response.data);
  const $ = cheerio.load(html);
  const startDateTd = $(
    "html body table tbody tr td table tbody tr td[width='50%']",
  );
  console.log(startDateTd.first().text().replace(/\s+/g, " "));
  let clubNameTag = $(
    'html body table tbody tr td div center font[size="+2"] b',
  );
  if (clubNameTag.text().trim() === "") {
    clubNameTag = $(
      'html body table tbody tr td div center table tbody tr td div table tbody tr td strong font[size="+2"]',
    );
  }
  console.log("Club Name:", clubNameTag.text());
  // const eventDate = $('html body table tbody tr td div font table tbody tr td font font center').text();
  // console.log(eventDate);
  const competitionRows = $(
    "html body table tbody tr td div font table tbody tr",
  );
  // We don't care about rows that don't match the expected number of columns.
  const filteredRows = competitionRows.filter((_i, el) => {
    if ($(el).children().length !== 4) {
      return false;
    }
    const firstChild = $(el).children()[1];
    return $(firstChild).attr("colspan") === "4";
  });

  const competitionData = [];
  for (let row of filteredRows) {
    const [_, eventCell, judgeCell, entriesCell] = Array.from(
      $(row).children(),
    );
    const { judgeName, judgeHref } = extractJudgeInfo(judgeCell);
    const { className, classHref } = extractClassInfo(eventCell);
    const entriesInfo = extractEntriesInfo(
      entriesCell,
    );
    if (!entriesInfo) {
      // We're only interested in competitions where there were entries.
      return;
    }
    const { numEntries, standardCompletionTime, numYards } = entriesInfo;
    const competitionEntry = {
      className,
      classHref,
      judge: {
        name: judgeName,
        href: judgeHref,
      },
      numEntries,
      standardCompletionTime,
      numYards,
    };
    competitionData.push(competitionEntry);
  }
  // We're only interested in competitions where there's a standard completion time or a course distance.
  const filteredCompetitionData = competitionData.filter((x) =>
    x.standardCompletionTime !== null && x.numYards !== null
  );

  const { results, errors } = await PromisePool.withConcurrency(20).for(
    filteredCompetitionData,
  ).process(async (competition) => {
    const detailsPageHtml =
      (await axios.get(`https://www.apps.akc.org${competition!.classHref}`))
        .data;
    const $ = cheerio.load(detailsPageHtml);
    const detailsFontTags = $('td[align="right"] > font');
    const detailsData = [];
    for (const detailsFontTag of detailsFontTags) {
      const parentRow = $(detailsFontTag).parent().parent();
      const [_a, _b, _c, placeCell, dogCell, pointsCell] = $(parentRow)
        .children();
      const place = $(placeCell).text().replace(/\s+/g, " ").trim();
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
  writeFileSync(
    `outputs/${eventNumber}.json`,
    JSON.stringify(
      { clubName: clubNameTag.text(), competitions: results },
      null,
      3,
    ),
  );
};

const listEvents = async () => {
  const today = new Date();
  const mmDDYYYY = `${
    today.getMonth() + 1
  }/${today.getDate()}/${today.getFullYear()}`;
  console.log(mmDDYYYY);
  const response = await axios.post(
    "https://webapps.akc.org/event-search/api/search/events",
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
        "from": "12/01/2021",
        "to": mmDDYYYY,
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
    {
      headers: {
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
    },
  );
  for (const result of response.data.events) {
    await main(result.eventNumber);
  }
};
// main();
listEvents();
