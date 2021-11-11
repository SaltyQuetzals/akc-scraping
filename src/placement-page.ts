import * as cheerio from 'cheerio';

/**
 * Parses a cell containing information about a dog that placed in a competition.
 * @param dogCell The <td> containing info about a dog that placed during the competition.
 * @returns The name of the dog handler, the AKC-registered name of the dog, the dog's breed, and the dog's ID within AKC.
 */
const extractDogInfo = (dogCell: cheerio.Element) => {
  const $ = cheerio.load(dogCell);
  const dogLink = $('a.white');
  const dogCellTextContent = $(dogCell).text();
  const dogBreed = $($('i')[0]).text().replace(/\s+/g, ' ');
  const dogHandler = dogCellTextContent
    .slice(dogCellTextContent.indexOf(dogBreed) + dogBreed?.length)
    .trim(); // The handler information immediately follows the dog's breed, so just slice the string from the end of the dog breed substring.
  const dogName = $(dogLink).text().replace(/\s+/g, ' ').trim()!;
  // The ID of the dog is buried in the href of the dog link, so parse the URL and extract the query parameter matching the ID.
  const dogId = new URL(
    `https://www.apps.akc.org${dogLink.attr('href')}`
  ).searchParams.get('dog_id')!;
  return {dogHandler, dogName, dogBreed, dogId};
};

/**
 * Parses a points cell.
 * @param pointsCell The <td> containing info about the performance of a dog that placed during the competition.
 * @returns The number of points the dog scored, as well as what time they achieved.
 */
const extractPointsInfo = (pointsCell: cheerio.Element) => {
  const $ = cheerio.load(pointsCell);
  const pointsCellTextContent = $(pointsCell).text().replace(/\s/g, ' ').trim();
  const match =
    /(?:pts\s+(?<points>[\d\.]+)\s+)?(?:Time\s+(?<time>[\d\.]+))?/g.exec(
      pointsCellTextContent
    );
  return {
    points: parseFloat(match?.groups!.points!),
    time: parseFloat(match?.groups!.time!),
  };
};

export {extractDogInfo, extractPointsInfo};
