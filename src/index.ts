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
  const classHref =
    /openWin\('(?<href>[^']+)/g.exec(classLink.attr("href")!)!.groups!.href;
  return { className, classHref };
};

/**
 * Parses a judge cell
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
    console.log($.text());
    return;
  }
  const entriesAndSecondsAndYardsRegex =
    /(?<entries>\d+)\s*ent\)(\s*(?<seconds>[\d\.]+)\s*Sec(\s*(?<yards>[\d\.]+)\s*yds)?)?/gim;
  let matches = entriesAndSecondsAndYardsRegex.exec(entriesData);
  if (!matches || !matches.groups) {
    return;
  }

  let numEntries: number = parseInt(matches.groups.entries);
  let numSeconds: number | null = null;
  if (matches.groups.seconds) {
    numSeconds = parseFloat(matches.groups.seconds);
  }
  let numYards: number | null = null;
  if (matches.groups.yards) {
    numYards = parseInt(matches.groups.yards);
  }
  return { numEntries, numSeconds, numYards };
};

const extractDogInfo = (dogCell: cheerio.Element) => {
  const $ = cheerio.load(dogCell);
  const dogLink = $("a.white");
  const dogCellTextContent = $(dogCell).text();
  const dogBreed = $($("i")[0]).text()
    .replace(/\s+/g, " ");
  const dogHandler = dogCellTextContent.slice(
    dogCellTextContent.indexOf(dogBreed) + dogBreed?.length,
  ).trim();
  const dogName = $(dogLink).text().replace(/\s+/g, " ").trim()!;
  const dogId = new URL(`https://www.apps.akc.org${dogLink.attr("href")}`)
    .searchParams.get("dog_id")!;
  return { dogHandler, dogName, dogBreed, dogId };
};

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

// const extractDataFromEventRows = (rows: Element[]) => {
//   const filteredRows = rows.filter((row) =>
//     row.children.length === 4 && row.children[1].hasAttribute("colspan") &&
//     row.children[1].getAttribute("colspan") === "4"
//   );
//   const results = filteredRows.map((row) => {
//     const [_, eventCell, judgeCell, entriesCell] = Array.from(row.children);
//     const { judgeName, judgeHref } = extractJudgeInfo(judgeCell);
//     const { className, classHref } = extractClassInfo(eventCell);
//     const entriesInfo = extractEntriesInfo(
//       entriesCell,
//     );
//     if (!entriesInfo) {
//       return;
//     }
//     const { numEntries, numSeconds, numYards } = entriesInfo;
//     return {
//       className,
//       classHref,
//       judgeName,
//       judgeHref,
//       numEntries,
//       numSeconds,
//       numYards,
//     };
//   });
//   return results;
// };

// const main = async () => {
//   const browser = await puppeteer.launch({ headless: false });
//   const page = await browser.newPage();
//   await page.goto(
//     "https://www.apps.akc.org/apps/events/search/index_results.cfm?action=plan&event_number=2020526309&get_event_by_number=yes&NEW_END_DATE1=",
//   );
//   await page.exposeFunction("extractClassInfo", extractClassInfo);
//   await page.exposeFunction("extractEntriesInfo", extractEntriesInfo);
//   await page.exposeFunction("extractJudgeInfo", extractJudgeInfo);
//   const clubName = await page.$$eval(
//     "html body table tbody tr td div center font b",
//     (tags) => {
//       return tags[0].textContent!;
//     },
//   );
//   const eventResults = (await page.$$eval(
//     "html body table tbody tr td div font table tbody tr",
//     extractDataFromEventRows,
//   )).filter((x) =>
//     x !== undefined && (x.numSeconds !== null || x.numYards !== null)
//   );

//   const { results, errors } = await PromisePool.withConcurrency(10).for(
//     eventResults,
//   ).process(async (classData) => {
//     const urlToTravelTo = `https://www.apps.akc.org${classData!.classHref}`;
//     const detailsPage = await browser.newPage();
//     await detailsPage.goto(urlToTravelTo);
//     const placementResults = await detailsPage.$$eval(
//       'td[align="right"] > font',
//       (fontTags) => {
//         if (fontTags.length === 0) {
//           return;
//         }
//         return fontTags.map((fontTag) => {
//           // Go up two parents on the DOM tree (which should be the tr this font tag is in).
//           const parentRow = fontTag.parentElement!.parentElement;
//           // Skip the first three cells of this row, because they are blank and don't contain data.
//           const [
//             _a,
//             _b,
//             _c,
//             placeCell,
//             dogCell,
//           ] = Array.from(parentRow!.children);
//           const place = placeCell.textContent!.replace(/\s+/g, " ").trim()!;
//           const { dogBreed, dogHandler, dogName, dogId } = extractDogInfo(
//             dogCell,
//           );
//           return { place, dogBreed, dogHandler, dogName, dogId };
//         });
//       },
//     );
//     await detailsPage.close();
//     return { ...classData, placementResults };
//   });
//   writeFileSync(
//     "output.json",
//     JSON.stringify({ clubName, competitions: results }, null, 3),
//   );
//   await browser.close();
// };

const cheerioMain = async () => {
  const html = await axios.get(
    "https://www.apps.akc.org/apps/events/search/index_results.cfm?action=plan&event_number=2020526309&get_event_by_number=yes&NEW_END_DATE1=",
  ).then((response) => response.data);
  const $ = cheerio.load(html);
  const clubNameTag = $(
    'html body table tbody tr td div center font[size="+2"] b',
  );
  console.log(clubNameTag.text());
  // const eventDate = $('html body table tbody tr td div font table tbody tr td font font center').text();
  // console.log(eventDate);
  const competitionRows = $(
    "html body table tbody tr td div font table tbody tr",
  );
  const filteredRows = competitionRows.filter((i, el) => {
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
      return;
    }
    const { numEntries, numSeconds, numYards } = entriesInfo;
    const competitionEntry = {
      className,
      classHref,
      judgeName,
      judgeHref,
      numEntries,
      numSeconds,
      numYards,
    };
    competitionData.push(competitionEntry);
  }
  const filteredCompetitionData = competitionData.filter((x) =>
    x.numSeconds !== null && x.numYards !== null
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
    "output.json",
    JSON.stringify(
      { clubName: clubNameTag.text(), competitions: results },
      null,
      3,
    ),
  );
};
cheerioMain();
