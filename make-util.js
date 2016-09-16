
require('shelljs');
var fs = require('fs');
var os = require('os');
var path = require('path');
var process = require('process');
var syncRequest = require('sync-request');

var downloadPath = path.join(__dirname, '_download');
var testPath = path.join(__dirname, '_test');

exports.run = function(cl, echo) {
    console.log('> ' + cl);
    var rc = 0;
    try {
        var res = exec(cl);
        rc = res.code;
        if (echo && res.output) {
            console.log(res.output);
        }

        if (rc != 0) {
            throw new Error(cl  + ' returned ' + res.code);
        }
    }
    catch (err) {
        exit(1);
    }
}
var run = exports.run;


var downloadFile = function (url) {
    // validate parameters
    if (!url) {
        throw new Error('Parameter "url" must be set.');
    }

    // short-circuit if already downloaded
    var scrubbedUrl = url.replace(/[/\:?]/g, '_');
    var targetPath = path.join(downloadPath, 'file', scrubbedUrl);
    var marker = targetPath + '.completed';
    if (!test('-f', marker)) {
        console.log('Downloading file: ' + url);

        // delete any previous partial attempt
        if (test('-f', targetPath)) {
            rm('-f', targetPath);
        }

        // download the file
        mkdir('-p', path.join(downloadPath, 'file'));
        var result = syncRequest('GET', url);
        fs.writeFileSync(targetPath, result.getBody());

        // write the completed marker
        fs.writeFileSync(marker, '');
    }

    return targetPath;
}

var downloadArchive = function (url) {
    // validate platform
    var platform = os.platform();
    if (platform != 'darwin' && platform != 'linux') {
        throw new Error('Unexpected platform: ' + platform);
    }

    // validate parameters
    if (!url) {
        throw new Error('Parameter "url" must be set.');
    }

    if (!url.match(/\.tar\.gz$/)) {
        throw new Error('Expected .tar.gz');
    }

    // short-circuit if already downloaded and extracted
    var scrubbedUrl = url.replace(/[/\:?]/g, '_');
    var targetPath = path.join(downloadPath, 'archive', scrubbedUrl);
    var marker = targetPath + '.completed';
    if (!test('-f', marker)) {
        // download the archive
        var archivePath = downloadFile(url);
        console.log('Extracting archive: ' + url);

        // delete any previously attempted extraction directory
        if (test('-d', targetPath)) {
            rm('-rf', targetPath);
        }

        // extract
        mkdir('-p', targetPath);
        var cwd = process.cwd();
        process.chdir(targetPath);
        try {
            run('tar -xzf "' + archivePath + '"');
        }
        finally {
            process.chdir(cwd);
        }

        // write the completed marker
        fs.writeFileSync(marker, '');
    }

    return targetPath;
}

var addPath = function (directory) {
    var separator;
    if (os.platform() == 'win32') {
        separator = ';';
    }
    else {
        separator = ':';
    }

    var existing = process.env['PATH'];
    if (existing) {
        process.env['PATH'] = directory + separator + existing;
    }
    else {
        process.env['PATH'] = directory;
    }
}
