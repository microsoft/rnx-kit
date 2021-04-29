import {extractLicences, createLicenceFileContents, ILicense} from "../src/write-third-party-notices";


async function getSampleLicenceData() : Promise<{ licences: ILicense[], map: Map<string, string> }> {
  const map = new Map();
  // Licence data in package.json
  map.set('@rnx-kit/cli', '../../node_modules/@rnx-kit/cli');
  // Licence data package.json and LICENCE file
  map.set('console-browserify', '../../node_modules/console-browserify');

  const licences = await extractLicences(map)

  // Hack versions to not depend on
  for (let licence of licences) {
    licence.version = "1.2.3-fixedVersionForTesting";
  }

  return { licences, map};
}



describe("licence", () => {

  test("extractLicences", async () => {

    const { licences } = await getSampleLicenceData();

    expect(licences).toMatchSnapshot();
  });


  test("createLicenceFileContents", async () => {
    const { licences, map } = await getSampleLicenceData();

    const licenceText = createLicenceFileContents(map, licences)

    expect(licenceText).toMatchSnapshot();
  });

  test("createLicenceFileContentsWithWrappers", async () => {
    const { licences, map } = await getSampleLicenceData();

    const licenceText = createLicenceFileContents(
      map,
      licences,
      ["preamble 1\n2\r\n3\r4", "Preamble 2"],
      ["additional 1\n2\r\n3\r4", "additional 2"]);

    expect(licenceText).toMatchSnapshot();
  });


});
