import {
  Element,
  Node,
} from "https://deno.land/x/deno_dom/deno-dom-wasm-noinit.ts";

export const parseAgRunName = (runName: string) => {
  const agRegex =
    /^Ag\s*(?<className>FAST|JWW|Colors)?\s*(?<division>[^\(]+)\((?<height>\d+)/g;
  runName = runName.replace(/\s+/g, " ").trim();
  const runMatches = agRegex.exec(runName);
  const groups = runMatches?.groups!;
  if (!groups) {
    console.error(
      `Got a runName that started with Ag, but no groups were matched: ${runName}`,
    );
    return;
  }
  let className = "Standard";
  if (groups.className) {
    className = groups.className;
  }
  const division = groups.division ? groups.division.trim() : null;
  const height = groups.height;
  return {
    division,
    height: parseInt(height),
    className,
  };
};

const parseT2BRunName = (runName: string) => {
  const t2bRegex = /(?<t2b>Time 2 Beat)(?<division>[^\(]+)\((?<height>\d+)/g;
  const runMatches = t2bRegex.exec(runName);
  const className = "T2B"; // We know that this is right because we're in this function.
  if (!runMatches) {
    console.error(
      `Got a runName that started with Ag, but wouldn't match regex: ${runName}`,
    );
    return;
  }
  const groups = runMatches.groups;
  if (!groups) {
    console.error(
      `Got a runName that started with Ag, but no groups were matched: ${runName}`,
    );
    return;
  }
  const division = groups.division;
  const height = groups.height;
  return {
    division: division.trim(),
    height: parseInt(height),
    className,
  };
};
/**
 * Parses a competition class cell. Class cells look something like this:
 * <td colspan="4" valign="top">
		<font size="-1" face="sans-serif, Arial, helvetica">
			<div align="center">
				<strong>
					<a name="4"></a>
					<a class="white" href="JavaScript: event_info = openWin('/apps/events/search/index_results.cfm?action=event_info&amp;comp_type=AG&amp;status=RSLT&amp;int_ref=4&amp;event_number=2020526309&amp;cde_comp_group=AG&amp;cde_comp_type=AG&amp;NEW_END_DATE1=&amp;key_stkhldr_event=133131731&amp;mixed_breed=N', 'eventinfo', 'width=800,height=600,toolbar=1,location=0,directories=0,status=0,menuBar=0,scrollBars=1,resizable=1' ); event_info.focus()">
						<strong>Ag Novice A (24 INCHES)</strong>
					</a>
				</strong>
			</div>
		</font>
	</td>
 * @param classCell The <td> tag containing a competition class anchor.
 * @returns The name of the competition class, and a path to its placement data.
 */
const extractClassInfo = (classCell: Element) => {
  const classLink = classCell.querySelector("a.white");
  if (!classLink) {
    console.error("Could not find a class link. Cannot extract class info.");
    return;
  }
  // The AKC page uses some kind of framework for opening links with JavaScript, but since we're interacting with HTML,
  // let's just parse out the path from the JavaScript code in the "href" attribute of the class link.
  const classHref =
    /openWin\('(?<href>[^']+)/g.exec(classLink.getAttribute("href")!)!
      .groups!.href;
  const runName = classLink.innerText;
  try {
    let result: {
      className: string | null;
      height: number | null;
      division: string | null;
    } | undefined;
    if (runName.startsWith("Ag")) {
      result = parseAgRunName(runName);
    } else if (runName.startsWith("Time 2 Beat")) {
      result = parseT2BRunName(runName);
    } else {
      console.error(
        `Encountered unknown run name: ${runName}. HREF = ${classHref}`,
      );
      return;
    }
    if (!result) {
      console.error(`Got an empty result after parsing. HREF = ${classHref}`);
      return;
    }
    const { className, division, height } = result;

    return {
      runName,
      className,
      division,
      classHref,
      height,
    };
  } catch (e) {
    console.error(`Error parsing ${runName}!`);
    console.error(e);
  }
};

/**
 * Parses a judge cell, returning the name of the judge and a link to the judge's profile. Judge cells look like:
 * 	<td valign="top">
      <font size="-1" face="sans-serif, Arial, helvetica">
        <a class="white" href="/apps/judges_directory/index.cfm?action=refresh_index_init&amp;judge_id=90966"> M  Fletcher </a>
      </font>
	  </td>
 * @param judgeCell The <td> tag containing a judge anchor.
 * @returns The name of the judge, as well as a path to the judge's information.
 */
const extractJudgeInfo = (judgeCell: Element) => {
  const judgeLink = judgeCell.querySelector("a.white");
  if (!judgeLink) {
    console.error("Could not find a judge link.");
    return;
  }
  const judgeName = judgeCell.innerText.replace(/\s+/g, " ").trim();
  const judgeHref = judgeLink.getAttribute("href");
  return { judgeName, judgeHref };
};

/**
 * Parses an entries cell, returning the number of entries, the standard completion time (if listed), and the number of yards (if listed)
 * Entries cells look like:
 *  <td colspan="2" valign="top">
		  <font size="-1" face="sans-serif, Arial, helvetica">(1ent)</font>
	  </td>
 * @param entriesCell The <td> containing info about the number of entries in a competition
 * @returns The number of entries, the standard completion time (SCT), and the distance of the course.
 */
const extractEntriesInfo = (entriesCell: Element) => {
  const entriesData = entriesCell.innerText.replace(/\s+/g, " ").trim();
  if (!entriesData) {
    console.error(`Entries data doesn't match:, ${entriesData}`);
    return;
  }
  // Matches:
  // (2ent) -> {entries: 2}
  // (14 ent) 30 Secs -> {entries: 14, seconds: 30, yards: null}
  // (13 ent) 20.5 Secs 100 yds -> {entries: 13, seconds: 20.5, yards: 100}
  // The regex ignores the whitespace in between each token, and will match only the parts that are present.
  const entriesAndSecondsAndYardsRegex =
    /(?<entries>\d+)\s*ent\)(\s*(?<seconds>[\d\.]+)\s*Sec(\s*(?<yards>[\d\.]+)\s*yds)?)?/gim;
  const matches = entriesAndSecondsAndYardsRegex.exec(entriesData);

  // If we didn't match the entries data at all, or there aren't any match groups, return nothing.
  if (!matches || !matches.groups) {
    return;
  }

  const numEntries: number = parseInt(matches.groups.entries);
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

/**
 * Determines whether an AKC event page table row contains agility trial data.
 * @param row An AKC event page table row.
 * @returns Whether or not this row contains agility trial data.
 */
const isTrialRow = (row: Node) => {
  const elem = row as Element;
  if (elem.children.length !== 4) {
    return false;
  }
  const firstChild = elem.children[1];
  return firstChild.hasAttribute("colspan") &&
    firstChild.getAttribute("colspan") === "4";
};

export { extractClassInfo, extractEntriesInfo, extractJudgeInfo, isTrialRow };
