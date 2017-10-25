"use strict";
const jsc = require('jsverify');

const emptyOutput = function() {
    return {
        generated: 0,
        shrink: 0,
        check: {failed: 0, exception: 0, success: 0},
        run: {failed: 0, exception: 0, success: 0}
    };
};

const wrapSyncCommandMethod = function(data, oldMethod) {
    return (...params) => {
        try {
            if (! oldMethod(...params)) {
                ++data.failed;
                return false;
            }
            else {
                ++data.success;
                return true;
            }
        }
        catch (err) {
            ++data.exception;
            return false;
        }
    };
};

const wrapCommandMethod = function(data, oldMethod) {
    return async (...params) => {
        try {
            if (! await oldMethod(...params)) {
                ++data.failed;
                return false;
            }
            else {
                ++data.success;
                return true;
            }
        }
        catch (err) {
            ++data.exception;
            return false;
        }
    };
};

const wrapCommand = function(gen, data) {
    const name = gen.command.constructor.name;
    
    data[name] = data[name] || emptyOutput();
    ++data[name].generated;

    gen.command.check = wrapSyncCommandMethod(data[name].check, gen.command.check);
    gen.command.run = wrapCommandMethod(data[name].run, gen.command.run);

    const oldShrink = gen.shrink;
    gen.shrink = () => {
        ++data[name].shrink;
        return oldShrink();
    };
    return gen;
};

const wrapAllCommands = function(gen, data) {
    return gen.map(c => wrapCommand(c, data));
};

const decorate = function(arb, out) {
    return jsc.bless({
        generator: (size) => wrapAllCommands(arb.generator(size), out),
        shrink: (arr) => arb.shrink(arr).map(cs => wrapAllCommands(cs, out)),
        show: (arr) => arb.show(arr)
    });
};

const padLeft = function(str, paddingValue) {
    return String(Array(paddingValue+1).join(' ') + (str + [])).slice(-paddingValue);
};
const padMeasure = str => padLeft(str, 12);

const printHead = function(name, record) {
    return `| ${padLeft("Command name", 20)} |`
        + `${padMeasure("")}  ${padMeasure("")} |`
        + `${padMeasure("")}  ${padMeasure("")}  ${padMeasure("check")} |`
        + `${padMeasure("")}  ${padMeasure("")}  ${padMeasure("run")} |`
        + '\n'
        + `| ${padLeft("", 20)} |`
        + `${padMeasure("generated")}  ${padMeasure("shrinks")} |`
        + `${padMeasure("success")}  ${padMeasure("failed")}  ${padMeasure("exception")} |`
        + `${padMeasure("success")}  ${padMeasure("failed")}  ${padMeasure("exception")} |`;
};
const printOneRecord = function(name, record) {
    return `| ${padLeft(name, 20)} |`
        + `${padMeasure(record.generated)} |`
        + `${padMeasure(record.shrink)} |`
        + `${padMeasure(record.check.success)} |`
        + `${padMeasure(record.check.failed)} |`
        + `${padMeasure(record.check.exception)} |`
        + `${padMeasure(record.run.success)} |`
        + `${padMeasure(record.run.failed)} |`
        + `${padMeasure(record.run.exception)} |`;
};

const sumObjects = function(r1, r2) {
    const out = {};
    const ks = Object.keys(r1);
    for (let idx = 0 ; idx != ks.length ; ++idx) {
        const k = ks[idx];
        out[k] = typeof r1[k] === 'number'
                ? r1[k] + r2[k]
                : sumObjects(r1[k], r2[k]);
    }
    return out;
};

const prettyPrint = function(out) {
    const head = printHead();
    const sep = head.split('\n')[0].replace(/[^|]/g, '-').replace(/\|/g, '+');
    const content = Object.keys(out).map(n => printOneRecord(n, out[n])).join('\n');
    const footer = printOneRecord("", Object.values(out).reduce(sumObjects, emptyOutput()));
    return `${sep}\n${head}\n${sep}\n${content}\n${sep}\n${footer}\n${sep}`;
};

module.exports = {
    decorate: decorate,
    prettyPrint: prettyPrint
};
