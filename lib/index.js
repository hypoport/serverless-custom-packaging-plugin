'use strict';

const path = require('path');
const fs = require('fs');
const archiver = require('archiver');

class ServerlessPlugin {
  constructor(serverless, options) {
    this.options = options;
    this.cwd = process.cwd();
    this.functions = serverless.service.functions;

    this.hooks = {
      'after:package:cleanup': () => this.createCustomPackages(this.functions),
      'after:deploy:function:packageFunction':() => this.createCustomPackages(this.functions)
    };
  }

  async createCustomPackages(functions) {
    console.log("Custom packaging lambdas...");

    const fNames = Object.keys(functions);
    const PackagePromises = await Promise.all(fNames.map(name => this.createPackage(name, functions)));

    return PackagePromises;
  }

  async createPackage(name, functions) {
    console.log("Processing " + name);
    const source = await
        this.getFnSourceDir(functions, name);
    const target = await
        this.getFnTarget(functions, name);
    
    console.log("cwd: " + this.cwd + " && " + "source: " + source + " && target: " + target );

    return await this.zipSources(path.join(this.cwd, source),
                                 path.join(this.cwd, target)).then((artifactPath) => {
      return artifactPath;
    });
  }

  async getFnSourceDir(functions, name) {
    const fn = functions[name];
    if ('package' in fn && 'path' in fn.package) {
      return fn.package.path
    }
    else {
      return name
    }
  }

  async getFnTarget(functions, name) {
    const fn = functions[name];
    if ('package' in fn && 'artifact' in fn.package) {
      return fn.package.artifact
    }
    else {
      return name + '.zip'
    }
  }

  async zipSources(source, target) {

    const outputDirname = path.dirname(target);

    console.log(target + " >> " + outputDirname);
    if (!fs.existsSync(outputDirname)) {
      try {
        fs.mkdirSync(outputDirname)
      }
      catch (err) {
        if (err.code !== 'EEXIST') {
          throw err
        }
      }
    }

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
    archive.glob('**/*.py', {
      cwd: source,
      absolute: false
    });

    if (fs.existsSync(path.join(source, 'lib'))) {
      archive.glob('**/*.py', {
        cwd: path.join(source, 'lib'),
        absolute: false
      })
    }
    archive.finalize();

    return new Promise((resolve, reject) => {
      output.on('close', () => resolve(target));
      archive.on('error', (err) => reject(err));
    });

  }

}

module.exports = ServerlessPlugin;
