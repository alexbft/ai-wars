/// <reference path="../vs_intel.js" />
/// <reference path="../utils.js" />
/// <reference path="../template.js" />
if (this.vs_intel) vs_intel.view = View;

var _ = require('underscore'),
    utils = require('../utils'),
    template = require('../template'),
    path = require('path'),
    deferred = require('deferred'),
    InternalError = utils.InternalError;

var View = module.exports = utils.Class({
    data: {
        isModal: false
    },

    init: function (moduleName, name, req, res, parent, options) {
        this.moduleName = moduleName;
        this.name = name;
        this.req = req;
        this.res = res;
        this.parent = parent;
        this.data = _.clone(this.constructor.prototype.data);
        this.data.me = this;
        this.data.parent = this.parent;
        this.data.ui = _.bind(this.renderWidget, this);
        this.data.uis = _.bind(this.renderWidgetShared, this);
        _.extend(this.data, options);
        this.onInit(options);
    },

    onInit: function () { },

    renderPage: function (next) {
        var me = this;
        me.data.startGen = utils.now();
        me.data.now = utils.now;
        this.render().then(function (res) {
            me.data.body = res;
            return template.render(template.layoutFile, me.data);
        }).then(function (res) {
            me.res.send(res);
        }).end(null, function(err) {
            next(err);
        });
    },

    render: function () {
        var me = this;
        return deferred(me.onRender() || true).then(function () {
            return template.render(path.resolve(__dirname, me.moduleName + '.html'), me.data);
        });
    },

    getChildrenNames: function() {
        return this.data.children ? _.keys(this.data.children) : [];
    },

    afterRender: function() {
        utils.require(require, './' + this.moduleName).initOnClient(this.getChildrenNames());
    },
    
    renderTo: function (el, isReplace) {
        var me = this;
        return me.render().then(function (res) {
            el[isReplace ? 'html' : 'append'](res);
            me.afterRender();
        });
    },

    onRender: function () { return true; },

    getAncestor: function () {
        var res = this;
        while (res.parent) { res = res.parent; }
        return res;
    },

    renderWidgetBase: function (widgetModule, widgetName, options) {
        var Widget = utils.require(require, './' + widgetModule);
        var widget = new Widget(widgetModule, widgetName, this.req, this.res, this, options);
        var top = this.getAncestor();
        top.data.children || (top.data.children = {});
        top.data.children[widgetModule] = true;
        return widget.render();
    },

    renderWidget: function (name, options) {
        return this.renderWidgetBase('server/' + name, name, options);
    },

    renderWidgetShared: function (name, options) {
        return this.renderWidgetBase('shared/' + name, name, options);
    },

    getModalOptions: function () { return this.modal || {}; },

    addHead: function (key, line) {
        this.headKeys || (this.headKeys = {});
        if (!(key in this.headKeys)) {
            this.headKeys[key] = true;
            this.data.head || (this.data.head = '');
            this.data.head += line + '\n';
        }
    },

    needAdmin: function() {
      if (!this.req.user || !this.req.user.admin) {
        throw new InternalError("Access denied", 403);
      }
    },

    setter: function(field) {
      var me = this;
      return function(data) {
        me.data[field] = data;
      }
    }

});

_.extend(View, {
    initOnClient: function (children) {
        _.each(children, function (name) {
            require('./' + name).onClient();
        });
        this.onClient();
    },

    onClient: function () { },

    subclass: function (proto) {
        var res = utils.Class(this, proto || {});
        res.initOnClient = this.initOnClient;
        res.onClient = this.onClient;
        return res;
    },
});