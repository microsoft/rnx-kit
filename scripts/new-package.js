// a script that takes a string as value and copies the folder packages/template
// to a new folder with the name of the value

// Include process module
const { exit } = require("process");
const process = require("process");

if (process.argv.length === 3) {
  var projectName = process.argv[2];

  // do some quick sanitization
  var cleanProjectName = projectName.replace(/[|&;$%@"<>()+,]/g, "");

  // copy the package/template folder to a new folder with the name of the value
  // and then change the package.json file to the new name
  const fse = require("fs-extra");
  const fs = require("fs");
  const path = require("path");
  const templatePath = path.join(__dirname, "../packages/template");
  const newProjectPath = path.join(
    __dirname,
    "../packages/" + cleanProjectName
  );

  // copy the template folder to the new project folder
  try {
    fse.copySync(templatePath, newProjectPath, {
      dereference: true,
      overwrite: false,
      errorOnExist: true,
    });
  } catch (error) {
    console.error(
      "ERROR: There's already a directory matching that package name!"
    );
  }

  // change the package.json file to the new name
  const packageJsonPath = path.join(newProjectPath, "package.json");
  const packageJson = require(packageJsonPath);
  packageJson.name = "@rnx-kit/" + cleanProjectName;
  packageJson.description = "New package called " + cleanProjectName;
  packageJson.homepage =
    "https://github.com/microsoft/rnx-kit/tree/main/packages/" +
    cleanProjectName +
    "#readme";
  packageJson.repository.directory = "packages/" + cleanProjectName;

  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify(packageJson, null, 2) + "\n"
  );

  // change the README.md file to the new name
  const readmePath = path.join(newProjectPath, "README.md");
  const readme = fs.readFileSync(readmePath, "utf8");
  const newReadme = readme.replace(/template/g, cleanProjectName);
  fs.writeFileSync(readmePath, newReadme);
} else {
  // error out
  console.error(
    "Invalid number of arguments: you should only pass the name of the new package"
  );
  exit(1);
}
