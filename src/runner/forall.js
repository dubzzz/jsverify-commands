"use strict";
const jsc = require('jsverify');
const {runner} = require('./runner');

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
    
    data[name] = data[name] || {
        generated: 0,
        shrink: 0,
        check: {failed: 0, exception: 0, success: 0},
        run: {failed: 0, exception: 0, success: 0}
    };
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

const alterArbCommands = function(arb, settings) {
    if (settings.metrics != null) {
        if (settings.metrics.out == null) {
            settings.metrics.out = {};
        }
        settings.metrics.toString = () => {
            const head = printHead();
            const sep = head.split('\n')[0].replace(/[^|]/g, '-').replace(/\|/g, '+');
            const content = Object.keys(settings.metrics.out).map(n => printOneRecord(n, settings.metrics.out[n])).join('\n');
            return `${sep}\n${head}\n${sep}\n${content}\n${sep}`;
        };
        
        return jsc.bless({
            generator: (size) => wrapAllCommands(arb.generator(size), settings.metrics.out),
            shrink: (arr) => arb.shrink(arr).map(cs => wrapAllCommands(cs, settings.metrics.out)),
            show: (arr) => arb.show(arr)
        });
    }
    return arb;
};

const forallImpl = function(arbSeed, arbCommands, warmup, teardown, settings) {
    return jsc.forall(arbSeed, alterArbCommands(arbCommands, settings), runner(warmup, teardown));
};

const DEFAULT_SEED_GEN = jsc.constant(undefined);
const DEFAULT_WARMUP = seed => new Object({state: {}, model: {}});
const DEFAULT_TEARDOWN = () => {};
const DEFAULT_SETTINGS = () => new Object({});

const isGenerator = function(obj) {
    return obj !== undefined && obj.generator !== undefined;
};
const forall = function(...params) {
    if (params.length === 0 || ! isGenerator(params[0])) {
        throw "forall requires at least a commands generator as first argument";
    }
    if (! isGenerator(params[1])) {
        return forallImpl(DEFAULT_SEED_GEN,
                params[0],
                params[1] || DEFAULT_WARMUP,
                params[2] || DEFAULT_TEARDOWN,
                params[3] || DEFAULT_SETTINGS);
    }
    return forallImpl(params[0],
            params[1],
            params[2] || DEFAULT_WARMUP,
            params[3] || DEFAULT_TEARDOWN,
            params[4] || DEFAULT_SETTINGS);
};
const assertForall = async function(...params) {
    const settings = (!isGenerator(params[1]) ? params[3] : params[4]) || DEFAULT_SETTINGS;
    const genericTreatment = () => {
        if (settings.metrics && settings.metrics.show) {
            console.log(settings.metrics.toString());
        }
    };
    try {
        const out = await jsc.assert(forall(...params));
        genericTreatment();
        return out;
    }
    catch (err) {
        genericTreatment();
        throw err;
    }
};

module.exports = {
    assertForall: assertForall,
    forall: forall
};
