import PromisePool = require('@supercharge/promise-pool/dist');
import axios from 'axios';
import * as cheerio from 'cheerio';
import { writeFile, writeFileSync } from 'fs';

import {
  extractClassInfo,
  extractJudgeInfo,
  extractEntriesInfo,
} from './event-page';
import {
  extractEventInfo as extractGeneralEventInfo,
  Event,
} from './akc-event-api';

import { extractPointsInfo, extractDogInfo } from './placement-page';
import { promisify } from 'util';

const DOMAIN = 'https://www.apps.akc.org';
const START_YEAR = 2021;
const START_MONTH = 0;
const START_DAY = 1;
const writeFilePromise = promisify(writeFile);

const extractCompetitionInfoForEvent = async (eventAndClubInfo: {
  eventNumber: string;
  eventName: string;
  clubName: string;
  startDate: Date;
  endDate: Date;
}) => {
  const url = `${DOMAIN}/apps/events/search/index_results.cfm?action=plan&event_number=${eventAndClubInfo.eventNumber}&get_event_by_number=yes&NEW_END_DATE1=`;
  console.log(url);
  const html = await axios.get(url).then(response => response.data);
  const $ = cheerio.load(html);
  const competitionRows = $(
    'html body table tbody tr td div font table tbody tr'
  );
  // We don't care about rows that don't match the expected number of columns.
  const filteredRows = competitionRows.filter((_i, el) => {
    if ($(el).children().length !== 4) {
      return false;
    }
    const firstChild = $(el).children()[1];
    return $(firstChild).attr('colspan') === '4';
  });

  const competitionData = [];
  for (const row of filteredRows) {
    const [_, eventCell, judgeCell, entriesCell] = Array.from(
      $(row).children()
    );
    const { judgeName, judgeHref } = extractJudgeInfo(judgeCell);
    const { className, classHref } = extractClassInfo(eventCell);
    const entriesInfo = extractEntriesInfo(entriesCell);
    if (!entriesInfo) {
      // We're only interested in competitions where there were entries.
      return;
    }
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
  // We're only interested in competitions where there's a standard completion time or a course distance.
  const filteredCompetitionData = competitionData.filter(
    x => x.standardCompletionTime !== null && x.numYards !== null
  );

  const { results, errors } = await PromisePool.withConcurrency(5)
    .for(filteredCompetitionData)
    .process(async competition => {
      const detailsPageUrl = competition!.classHref;
      const detailsPageHtml = (await axios.get(detailsPageUrl)).data;
      const $ = cheerio.load(detailsPageHtml);
      const detailsFontTags = $('td[align="right"] > font');
      const detailsData = [];
      for (const detailsFontTag of detailsFontTags) {
        const parentRow = $(detailsFontTag).parent().parent();
        const [_a, _b, _c, placeCell, dogCell, pointsCell] =
          $(parentRow).children();
        const place = $(placeCell).text().replace(/\s+/g, ' ').trim();
        const { dogBreed, dogHandler, dogName, dogId } = extractDogInfo(dogCell);
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
  const result = { eventInfo: eventAndClubInfo, competitions: results };
  return writeFilePromise(
    `outputs/${eventAndClubInfo.eventNumber}.json`,
    JSON.stringify(
      result
    )
  );
};

const listEvents = async () => {
  const today = new Date();
  let startDate = new Date(START_YEAR, START_MONTH, START_DAY);
  while (startDate < today) {
    let tempDate = new Date(startDate);
    let endDate = new Date(tempDate.setMonth(tempDate.getMonth() + 1));
    if (endDate > today) {
      endDate = today;
    }
    const startMmDDYYYY = `${startDate.getMonth() + 1
    }/${startDate.getDate()}/${startDate.getFullYear()}`;
    const endMmDDYYYY = `${endDate.getMonth() + 1
    }/${endDate.getDate()}/${endDate.getFullYear()}`;
    const response = await axios.post(
      'https://webapps.akc.org/event-search/api/search/events',
      {
        address: {
          eventSetting: { indoor: true, outdoor: true, outsideCovered: true },
          location: { cityState: '', latitude: 0, longitude: 0, zipCode: null },
          radius: 'any',
          searchByState: false,
          searchByCity: false,
          searchText: 'All Cities & States',
        },
        breedCode: '4444',
        breedName: 'All-American Dogs',
        breedId: 'ALL_AMERICAN',
        dateRange: { from: startMmDDYYYY, to: endMmDDYYYY, type: 'event' },
        competition: {
          items: [
            { selected: true, value: { compType: 'AG' }, label: 'Agility (AG)' },
          ],
          filters: [],
        },
      },
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:94.0) Gecko/20100101 Firefox/94.0',
          Accept: 'application/json',
          'Accept-Language': 'en-US,en;q=0.5',
          'Content-Type': 'application/json',
          'x-csrf-token': 'token',
          'Sec-Fetch-Dest': 'empty',
          'Sec-Fetch-Mode': 'cors',
          'Sec-Fetch-Site': 'same-origin',
        },
      }
    );
    console.log(`Received a total of ${response.data.events.length} events between ${startMmDDYYYY} and ${endMmDDYYYY}.`);
    const extractedFilteredEvents = (response.data.events as Event[]).map(extractGeneralEventInfo).filter(event => event.endDate < today);
    console.log(`Going to extract data for ${extractedFilteredEvents.length} events.`)
    const { results, errors } = await PromisePool.withConcurrency(5).for(extractedFilteredEvents).process(extractCompetitionInfoForEvent)
    for (const error of errors) {
      console.log(error);
    }
  }
};
// main();
listEvents();
