'use strict';

const path = require('path');
const fs = require('fs');
const archiver = require('archiver');
const zlib = require('zlib');

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

    async zipSources(source, target, globs, libs, serverless) {

        this.createDirIfNotExists(path.dirname(target));

        const output = fs.createWriteStream(target);
        const archive = archiver('zip', {store: true, zlib: {flush: zlib.Z_SYNC_FLUSH}});

        this.log("Zipping " + source + " to " + target);



        archive.on('error', function (err) {
            throw err;
        });

        archive.on('warning', function (err) {
            throw err;
        });

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

        archive.pipe(output);
        archive.finalize();

        return new Promise((resolve, reject) => {
            output.on('close', () => {
                serverless.cli.log(target + ' finalized and closed. (' + (archive.pointer() / 1024).toPrecision(3) + ' kB)');
                resolve(target)
            });
            output.on('error', (err) => reject(err));
        });

    }

}


function getFnIncludeGlobs(functionObject) {
    if ('package' in functionObject && 'include_globs' in functionObject.package) {
        return functionObject.package.include_globs
    }
    return '**/*.py'
}

function getFnSourceDir(functionObject) {
    if ('package' in functionObject && 'path' in functionObject.package) {
        return functionObject.package.path
    }
    return false
}

function getFnTarget(functionObject) {
    if ('package' in functionObject && 'artifact' in functionObject.package) {
        return functionObject.package.artifact
    }
    return false
}

function getLibDir(functionObject) {
    if ('package' in functionObject && 'libs' in functionObject.package) {
        return functionObject.package.libs
    }
    return false
}


module.exports = ServerlessPlugin;
