'use strict';

const path = require('path');
const fs = require('fs');
const archiver = require('archiver');

class ServerlessPlugin {
  constructor(serverless, options) {
    this.options = options;
    this.cwd = process.cwd();
    this.functions = serverless.service.functions;
    this.serverless = serverless;
    this.log = serverless.cli.log.bind(serverless.cli);

    this.hooks = {
      'after:package:cleanup': () => this.createCustomPackages(this.functions),
      'after:deploy:function:packageFunction': () => this.packageSingleFunction()
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
      return new Error('Function name must be set');
    }
  }

  async createCustomFunctionPackage(functionName) {
    this.log("Processing " + functionName);
    const functionObject = this.serverless.service.getFunction(functionName);
    return await
        Promise.resolve(this.createPackage(functionObject, functionName))
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
    const source = getAbsPath(this.getFnSourceDir(functionObject) || functionName);
    const target = getAbsPath(this.getFnTarget(functionObject) || `${functionName}.zip`);
    const libs = getAbsPath(this.getLibDir(functionObject));
    const globs = this.getFnIncludeGlobs(functionObject);

    const zipWithGlobs = globs => libs => source => target => this.zipSources(source, target, globs, libs);

    return await
        zipWithGlobs(globs)(libs)(source)(target).then((artifactPath) => {
          return artifactPath;
        });
  }

  getFnIncludeGlobs(functionObject) {
    if ('package' in functionObject && 'include_globs' in functionObject.package) {
      return functionObject.package.include_globs
    }
    return '**/*.py'
  }

  getFnSourceDir(functionObject) {
    if ('package' in functionObject && 'path' in functionObject.package) {
      return functionObject.package.path
    }
    return false
  }

  getFnTarget(functionObject) {
    if ('package' in functionObject && 'artifact' in functionObject.package) {
      return functionObject.package.artifact
    }
    return false
  }

  getLibDir(functionObject) {
    if ('package' in functionObject && 'libs' in functionObject.package) {
      return functionObject.package.libs
    }
    return false
  }

  async createDirIfNotExists(dir) {
    if (!fs.existsSync(dir)) {
      await
          new Promise(async (resolve, reject) => {
            fs.mkdir(dir, err => {
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

  async zipSources(source, target, globs, libs) {

    this.createDirIfNotExists(path.dirname(target));

    const output = fs.createWriteStream(target);
    const archive = archiver('zip');

    this.log("Zipping " + source + " to " + target);

    output.on('finish', function () {
      console.log(archive.pointer() + ' total bytes');
      console.log(target + ' finalized and closed.');
    });

    archive.on('error', function (err) {
      throw err;
    });

    archive.on('warning', function (err) {
      throw err;
    });

    archive.pipe(output);

    const addGlob = archiveptr => glob => archiveptr.glob(glob, {
      cwd: source,
      absolute: false
    });

    if (Array.isArray(globs)) {
      globs.map(glob => {
        addGlob(archive)(glob)
      });
    }
    else {
      addGlob(archive)(globs)
    }

    if (libs) {
      this.log("Adding libraries in: " + libs);
      archive.glob("**/*", {cwd: libs, absolute: false, dot: true})
    }

    archive.finalize();

    return new Promise((resolve, reject) => {
      output.on('close', () => resolve(target));
      archive.on('error', (err) => reject(err));
    });

  }

}

module.exports = ServerlessPlugin;
