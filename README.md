# serverless-custom-packaging-plugin

[![serverless](http://public.serverless.com/badges/v3.svg)](http://www.serverless.com)
[![npm version](https://badge.fury.io/js/serverless-custom-packaging-plugin.svg)](https://badge.fury.io/js/serverless-custom-packaging-plugin)
[![Github All Releases](https://img.shields.io/github/downloads/hypoport/serverless-custom-packaging-plugin/total.svg)]()
[![license](https://img.shields.io/npm/l/serverless-custom-packaging-plugin.svg)]()

## What is this plugins purpose?

This plugin was originally built to allow deployment of arbitrarily nested python lambdas using serverless. The functionality is related to the one discussed in [this serverless issue (#3366)](https://github.com/serverless/serverless/issues/3366).

### The Problem
 
 Vanilla serverless packages your source-code, but retains the folder structure inside the zip-file. However, AWS Lambda can only find the entry-point to your function if it is packaged in a zip-files at root level (see [the AWS-Lambda docs](http://docs.aws.amazon.com/lambda/latest/dg/lambda-python-how-to-create-deployment-package.html)). 
 
### How it was solved

You define a `path` that you want to package inside of serverless's `package` property. The plugin then packages your code, such that te defined path becomes the root-path (`.`) of the package zip-file. 

### What else it can do

1. **Custom artifact path**. You can define an `artifact` property. The zip-file will be placed there. 
2. If you want to **include only certain file-names or extensions** you may define them using the `include_globs` property. 
3. If you have **additional libraries** you need inside the lambda environment you may define a path in the `libs` property. The contents of this folder will be packaged alongside your functions code (in the root of the zip-file). This lets you include arbitrary python modules (i.e. built against the Lambda AMI inside of docker), but keep them away from your code during development.

## Installation

```
npm install serverless-custom-packaging-plugin --save-dev
```
This installs the plugin into your `node_modules` and adds the dev-dependency to your `package.json`.

## How to use it

```yaml
plugins:
  - serverless-custom-packaging-plugin
...
package:
  artifact: path/to/my/artifact.zip
...
functions:
  myFunction:
    ...
    package:
      path: path/to/my/code
      artifact: path/to/my/artifact.zip
      libs: path/to/libs 
      include_globs:
        - "**/*.py"
        - "**/*.json"
```

## Tested with ...

| Serverless version | `serverless deploy` | `serverless package -f <function-name>` | `serverless deploy function -f <function_name>` | comment |
|:---:|:---:|:---:|:---:|---:|
| 1.10.0 | <img src=https://cdn.pixabay.com/photo/2017/03/28/01/46/check-mark-2180770_960_720.png width=25> | <img src=https://cdn.pixabay.com/photo/2017/03/28/01/42/attention-2180765_960_720.png width=25>| |
| 1.11.0 | | | | not tested  |
| 1.12.0 | | | | not tested  |
| 1.13.0 | | | |not tested  |
| 1.14.0 | <img src=https://cdn.pixabay.com/photo/2017/03/28/01/46/check-mark-2180770_960_720.png width=25> | <img src=https://cdn.pixabay.com/photo/2017/03/28/01/46/check-mark-2180770_960_720.png width=25> | <img src=https://cdn.pixabay.com/photo/2017/03/28/01/42/attention-2180765_960_720.png width=25> |
| 1.15.0 | <img src=https://cdn.pixabay.com/photo/2017/03/28/01/42/attention-2180765_960_720.png width=25> | <img src=https://cdn.pixabay.com/photo/2017/03/28/01/42/attention-2180765_960_720.png width=25> | <img src=https://cdn.pixabay.com/photo/2017/03/28/01/42/attention-2180765_960_720.png width=25> |
| 1.16.0 | <img src=https://cdn.pixabay.com/photo/2017/03/28/01/46/check-mark-2180770_960_720.png width=25> | <img src=https://cdn.pixabay.com/photo/2017/03/28/01/46/check-mark-2180770_960_720.png width=25> | <img src=https://cdn.pixabay.com/photo/2017/03/28/01/42/attention-2180765_960_720.png width=25> |
| 1.17.0 | <img src=https://cdn.pixabay.com/photo/2017/03/28/01/46/check-mark-2180770_960_720.png width=25> | <img src=https://cdn.pixabay.com/photo/2017/03/28/01/46/check-mark-2180770_960_720.png width=25> | <img src=https://cdn.pixabay.com/photo/2017/03/28/01/42/attention-2180765_960_720.png width=25> / <img src=https://cdn.pixabay.com/photo/2017/03/28/01/46/check-mark-2180770_960_720.png width=25> | everything works when patched |
| 1.18.0 | <img src=https://cdn.pixabay.com/photo/2017/03/28/01/46/check-mark-2180770_960_720.png width=25> | <img src=https://cdn.pixabay.com/photo/2017/03/28/01/46/check-mark-2180770_960_720.png width=25> | <img src=https://cdn.pixabay.com/photo/2017/03/28/01/42/attention-2180765_960_720.png width=25> | `package.individually = true` must be set

### Patches

We have created a couple of patches (so far only for serverless version 1.17.0) to get all the functionality we needed working.
You are free to use these patches, but be aware that this could potentially break (other) serverless functionality. 

## A word of caution

This is a work in progress. This means no guarantees that everything will work as promised. If you would like some more functionality you are welcome to contribute. We greatly appreciate any testing you do with different serverless versions and setups.
