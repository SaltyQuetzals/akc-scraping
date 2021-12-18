import { Element } from "https://deno.land/x/deno_dom/deno-dom-wasm-noinit.ts";

/**
 * Parses a cell containing information about a dog that placed in a competition.
 * @param dogCell The <td> containing info about a dog that placed during the competition.
 * @returns The name of the dog handler, the AKC-registered name of the dog, the dog's breed, and the dog's ID within AKC.
 */
const extractDogInfo = (dogCell: Element) => {
  const dogLink = dogCell.querySelector("a.white");
  const dogCellTextContent = dogCell.innerText;
  const dogBreed = dogCell.getElementsByTagName("i")[0].innerText.replace(
    /\s+/g,
    " ",
  );
  const dogHandler = dogCellTextContent
    .slice(dogCellTextContent.indexOf(dogBreed) + dogBreed?.length)
    .trim(); // The handler information immediately follows the dog's breed, so just slice the string from the end of the dog breed substring.
  const registeredName = dogLink?.innerText.replace(/\s+/g, " ").trim()!;
  // The ID of the dog is buried in the href of the dog link, so parse the URL and extract the query parameter matching the ID.
  const akcRegistrationNumber = new URL(
    `https://www.apps.akc.org${dogLink?.getAttribute("href")}`,
  ).searchParams.get("dog_id")!;
  return { dogHandler, registeredName, dogBreed, akcRegistrationNumber };
};

/**
 * Parses a points cell.
 * @param pointsCell The <td> containing info about the performance of a dog that placed during the competition.
 * @returns The number of points the dog scored, as well as what time they achieved.
 */
const extractPointsInfo = (pointsCell: Element) => {
  const pointsCellTextContent = pointsCell.innerText.replace(/\s/g, " ").trim();
  const match = /(?:pts\s+(?<points>[\d\.]+)\s+)?(?:Time\s+(?<time>[\d\.]+))?/g
    .exec(
      pointsCellTextContent,
    );
  return {
    points: parseFloat(match?.groups!.points!),
    time: parseFloat(match?.groups!.time!),
  };
};

export { extractDogInfo, extractPointsInfo };
