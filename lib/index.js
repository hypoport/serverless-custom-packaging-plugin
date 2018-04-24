"use strict";

const BbPromise = require("bluebird");
const path = require("path");
const fs = require("fs");
const archiver = require("archiver");
const fse = require('fs-extra');
const JSZip = require("jszip");
const glb = require("glob");
const FileSaver = require('file-saver');


BbPromise.promisifyAll(glb);
BbPromise.promisifyAll(fs);
BbPromise.promisifyAll(JSZip);
BbPromise.promisifyAll(fse);

class ServerlessPlugin {
  constructor(serverless, options) {
    this.options = options;
    this.cwd = process.cwd();
    this.functions = serverless.service.functions;
    this.serverless = serverless;
    this.log = serverless.cli.log.bind(serverless.cli);

    this.hooks = {
      "after:package:cleanup": () => this.createCustomPackages(this.functions),
      "after:deploy:function:packageFunction": () => this.packageSingleFunction()
    }
  }

  async createCustomPackages(functions) {
    this.log("Custom packaging lambdas...");
    const fNames = Object.keys(functions);
    return await
      Promise.all(fNames.map(name => this.createCustomFunctionPackage(name)));
  }

  async packageSingleFunction() {
    if (this.options.function) {
      return await this.createCustomFunctionPackage(this.options.function)
    }
    else {
      return new Error("Function name must be set");
    }
  }

  async createCustomFunctionPackage(functionName) {
    this.log("Processing " + functionName);
    const functionObject = this.serverless.service.getFunction(functionName);
    return await
      Promise.resolve(this.createPackage(functionObject, functionName))
  }

  async zipSources(source, target, globs, libs, serverless) {

    this.createDirIfNotExists(path.dirname(target));

    const output = fs.createWriteStream(target);
    let zip;

    zip = new JSZip();

    this.log("Zipping " + source + " to " + target);

    const addToZip = (globs, options) => glb(globs, options, function (er, files) {
      files.map((file) => {
        serverless.cli.log("Adding " + file);
        let content = fs.readFileSync(file);
        zip.file(file.replace(options.cwd, ""), content)
      })
    });

    let files = addToZip(globs, {cwd: source, absolute: true, dot: true, nodir: true});

    if (libs) {
      this.log("Adding libraries in: " + libs);
      addToZip("**/*", {cwd: libs, absolute: true, dot: true, nodir: true})
    }

    files.on("end", (resolv, reject) => {
      let stream = zip.generateNodeStream({type: 'nodebuffer', streamFiles: true})
        .pipe(output)
        .on('finish', function () {
          serverless.cli.log(output.bytesWritten + " bytes written to " + target);
        });

      return streamToPromise(stream)
    });


  }

  async createPackage(functionObject, functionName) {
    const getAbsPath = inputPath => {
      if (inputPath) {
        return path.join(this.cwd, inputPath);
      }
      else {
        return inputPath
      }
    };
    const source = getAbsPath(getFnSourceDir(functionObject) || functionName);
    const target = getAbsPath(getFnTarget(functionObject) || `${functionName}.zip`);
    const libs = getAbsPath(getLibDir(functionObject));
    const globs = getFnIncludeGlobs(functionObject);

    const zipWithGlobs = globs => libs => source => target => this.zipSources(source, target, globs, libs, this.serverless);

    return await
      zipWithGlobs(globs)(libs)(source)(target).then((artifactPath) => {
        return artifactPath;
      });
  }

  async createDirIfNotExists(dir) {
    if (!fs.existsSync(dir)) {
      await
        new Promise(async (resolve, reject) => {
          fs.mkdirSync(dir, err => {
            if (err) {
              resolve(false)
            }
            else {
              resolve(true)
            }
          })
        });
    }
    return true
  }

}

function streamToPromise(stream) {
  return new Promise(function (resolve, reject) {
    stream.on("end", resolve);
    stream.on("error", reject);
  });
}

function getFnIncludeGlobs(functionObject) {
  if ("package" in functionObject && "include_globs" in functionObject.package) {
    return functionObject.package.include_globs
  }
  return "**/*.py"
}

function getFnSourceDir(functionObject) {
  if ("package" in functionObject && "path" in functionObject.package) {
    return functionObject.package.path
  }
  return false
}

function getFnTarget(functionObject) {
  if ("package" in functionObject && "artifact" in functionObject.package) {
    return functionObject.package.artifact
  }
  return false
}

function getLibDir(functionObject) {
  if ("package" in functionObject && "libs" in functionObject.package) {
    return functionObject.package.libs
  }
  return false
}


module.exports = ServerlessPlugin;
