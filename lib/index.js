'use strict';

const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const BbPromise = require('bluebird');

class ServerlessPlugin {
  constructor(serverless, options) {
    this.options = options;
    this.cwd = process.cwd();
    this.functions = serverless.service.functions;
    this.serverless = serverless;

    this.hooks = {
      'after:package:cleanup': () => this.createCustomPackages(this.functions),
      'after:deploy:function:packageFunction': () => this.packageSingleFunction()
    }
  }

  async createCustomPackages(functions) {
    console.log("Custom packaging lambdas...");
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
    console.log("Processing " + functionName);
    const functionObject = this.serverless.service.getFunction(functionName);
    return await
        Promise.resolve(this.createPackage(functionObject, functionName))
  }

  async createPackage(functionObject, functionName) {
    const source = this.getFnSourceDir(functionObject) || functionName;
    const target = this.getFnTarget(functionObject) || `${functionName}.zip`;
    const globs = this.getFnIncludeGlobs(functionObject);

    const zipWithGlobs = globs => source => target => this.zipSources(source, target, globs);

    return await
        zipWithGlobs(globs)(path.join(this.cwd, source))(path.join(this.cwd, target)).then((artifactPath) => {
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

  async   createDirIfNotExists(dir) {
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

  async   zipSources(source, target, globs) {

    this.createDirIfNotExists(path.dirname(target));

    const output = fs.createWriteStream(target);
    const archive = archiver('zip');

    console.log("Zipping " + source + " to " + target);

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

    archive.finalize();

    return new Promise((resolve, reject) => {
      output.on('close', () => resolve(target));
      archive.on('error', (err) => reject(err));
    });

  }

}

module.exports = ServerlessPlugin;
