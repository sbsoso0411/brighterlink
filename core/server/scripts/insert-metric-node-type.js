"use strict";
require("../general/models");
require("../bl-brighter-view/models");
require("../bl-data-sense/models");

var mongoose = require("mongoose"),
    config = require("../../config/environment"),
    Tag = mongoose.model("tag"),
    async = require("async"),
    consts = require("../libs/consts"),
    log = require("../libs/log")(module),
    utils = require("../libs/utils"),
    _ = require("lodash"),
    argv = require("minimist")(process.argv.slice(2));

function insertMetricNodeType(finalCallback) {
    async.waterfall([
        function (callback) {
            Tag.find({}, callback);
        },
        function (foundTags, callback) {

            var tagsMap = {};
            _.each(foundTags, function(tag) {
                tagsMap[tag._id.toString()] = tag;
            });

            var tagsToInsert = [];

            for(var i=0; i < foundTags.length; i++) {
                if(foundTags[i].tagType === consts.TAG_TYPE.Metric) {
                    var parentNodeId = foundTags[i].parents[0].id.toString();
                    var parent = tagsMap[parentNodeId];

                    foundTags[i].nodeType = parent.nodeType;
                    tagsToInsert.push(foundTags[i]);
                }
            }

            console.log("Update nodes: " + tagsToInsert.length);
            async.each(tagsToInsert, function(tag, cb) {
                tag.save(cb);
            }, function(err) {
                callback(err);
            });
        }
    ], function (err, result) {
        if (err) {
            var correctErr = utils.convertError(err);
            log.error(correctErr);
            if(finalCallback) {
                return finalCallback(correctErr, null);
            }
        } else {
            if(finalCallback) {
                return finalCallback(null, result);
            }
        }

        if(!finalCallback) {
            console.log("OK");
            process.exit();
        }
    });


}

if(argv.run) {

    mongoose.connect(config.get("db:connection"), config.get("db:options"), function (mongooseErr) {

        insertMetricNodeType(null);
    });
}

exports.insertMetricNodeType = insertMetricNodeType;