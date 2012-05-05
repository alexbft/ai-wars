/// <reference path="../view.js" />
module.exports = require('../view').subclass({
    onInit: function () {
        this.getAncestor().addHead('codemirror', '<link rel="stylesheet" href="/css/codemirror.css" />');
    }
});

module.exports.onClient = function() {
    $('.code_editor select').change(function() {
        var $this = $(this);
        var editor = $this.parents('.code_editor').data('editor');
        if (editor.isNew) {
            editor.isNew = false;
            $this.find('option[value="new"]').data('code', editor.getValue());
        }
        editor.updating = true;
        editor.setValue($this.find('option[value="' + $this.val() + '"]').data('code'));
    });
    $('.code_editor').each(function() {
        var $this = $(this);
        var ta = $this.find('textarea').get(0);
        var select = $this.find('select');
        $this.data('editor', CodeMirror.fromTextArea(ta, {
            theme: 'lesser-dark',
            lineWrapping: true,
            indentUnit: 4,
            onChange: function (me) {
                if (me.updating) {
                    me.updating = false;
                    return;
                }
                if (select.val() != "new") {
                    if (!select.find('option[value="new"]').length) {
                        select.append('<option value="new">Новый Бот</option>');
                    }
                    select.val('new');
                    me.isNew = true;
                }
            }
        }));
        select.val($this.data('selId')).trigger('change');
    });
}