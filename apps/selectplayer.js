import { MonksEnhancedJournal, log, setting, i18n } from '../monks-enhanced-journal.js';

export class SelectPlayer extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
    users = [];
    showpic = false;
    updatepermission = false;

    constructor(sheet, options = {}) {
        super(options);
        this.object = sheet.object;
        this.showpic = (options.showpic != undefined ? options.showpic : false);
        this.updatepermission = (options.updatepermission != undefined ? options.updatepermission : false);

        this.journalsheet = sheet;
    }

    static DEFAULT_OPTIONS = {
        id: "select-player",
        classes: ["select-sheet"],
        tag: "form",
        form: {
            handler: SelectPlayer.#onSubmit,
            closeOnSubmit: true,
            submitOnClose: false,
            submitOnChange: false
        },
        position: {
            width: 400,
            height: "auto"
        },
        window: {
            title: "MonksEnhancedJournal.SelectPlayer",
            contentClasses: ["standard-form"]
        },
        actions: {
            "showall": SelectPlayer.showAll,
            "show": SelectPlayer.showSelected
        }
    };

    static PARTS = {
        form: {
            template: "modules/monks-enhanced-journal/templates/selectplayer.hbs"
        }
    };

    _prepareContext(options) {
        this.users = game.users.map(u => {
            return {
                id: u.id,
                name: u.name,
                active: u.active,
                selected: false
            };
        }).filter(u => u.id != game.user.id);
        return {
            users: this.users,
            picchoice: this.canShowPic(),
            showpic: this.showpic,
            updatepermission: this.updatepermission
        };
    }

    canShowPic() {
        let type = this.journalsheet.object?.flags["monks-enhanced-journal"]?.type || 'oldentry';
        return ((["person", "place", "poi", "event", "quest", "oldentry", "organization", "shop", "oldentry", "journalentry", "base"].includes(type) || this.object.documentName == 'Actor') && this.object.img);
    }

    static async #onSubmit(event, form, formData) {

    }

    updateSelection(event) {
        log('Changing selection');
        let ctrl = event.currentTarget;
        let li = ctrl.closest('li');
        let id = li.dataset.userId;

        let user = this.users.find(u => u.id == id);
        user.selected = ctrl.checked;
    }

    updateShowPic(event) {
        this.showpic = event.currentTarget.checked;
        if (this.showpic) {
            this.updatepermission = false;
            const permCheckbox = this.element.querySelector('.update-permission');
            if (permCheckbox) permCheckbox.checked = false;
        }
    }

    updatePermission(event) {
        this.updatepermission = event.currentTarget.checked;
        if (this.updatepermission) {
            this.showpic = false;
            const picCheckbox = this.element.querySelector('.show-pic');
            if (picCheckbox) picCheckbox.checked = false;
        }
    }

    showPlayers(mode, event) {
        let users = this.users.filter(u => u.selected);
        if (mode == 'players' && users.length == 0) {
            ui.notifications.info(i18n("MonksEnhancedJournal.msg.NoPlayersSelected"));
            return;
        }
        event.data = { users: (mode == 'all' ? null : users), options: { showpic: this.showpic, updatepermission: this.updatepermission }};
        this.journalsheet._onShowPlayers.call(this.journalsheet, event);
    }

    static showAll(event, target) {
        this.showPlayers('all', event);
    }

    static showSelected(event, target) {
        this.showPlayers('players', event);
    }

    _onRender(context, options) {
        super._onRender(context, options);

        const userCheckboxes = this.element.querySelectorAll('input[type="checkbox"].user-select');
        userCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', this.updateSelection.bind(this));
        });

        const picCheckbox = this.element.querySelector('input[type="checkbox"].pic-select');
        if (picCheckbox) {
            picCheckbox.addEventListener('change', this.updateShowPic.bind(this));
        }

        const permCheckbox = this.element.querySelector('input[type="checkbox"].update-permission');
        if (permCheckbox) {
            permCheckbox.addEventListener('change', this.updatePermission.bind(this));
        }
    }
}