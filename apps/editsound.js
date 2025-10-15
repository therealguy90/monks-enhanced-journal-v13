import { MonksEnhancedJournal, log, error, i18n, setting, makeid, getVolume } from "../monks-enhanced-journal.js";

export class EditSound extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
    constructor(object, sound, options = {}) {
        super(options);
        this.object = object;
        this.soundfile = sound;
    }

    static DEFAULT_OPTIONS = {
        id: "journal-editsound",
        classes: ["edit-sound"],
        tag: "form",
        form: {
            handler: EditSound.#onSubmit,
            closeOnSubmit: true
        },
        position: {
            width: 500,
            height: "auto"
        },
        window: {
            title: "MonksEnhancedJournal.EditSound",
            contentClasses: ["standard-form"]
        }
    };

    static PARTS = {
        form: {
            template: "./modules/monks-enhanced-journal/templates/edit-sound.hbs"
        }
    };

    _prepareContext(options) {
        let sound = foundry.utils.mergeObject({volume: 1, loop: true, autoplay: true}, (this.object.getFlag("monks-enhanced-journal", "sound") || {}));
        return {
            sound: sound
        };
    }

    static async #onSubmit(event, form, formData) {
        let data = foundry.utils.expandObject(formData.object);

        if (this.soundfile) {
            let oldData = this.object.getFlag('monks-enhanced-journal', 'sound');
            if (oldData.volume != data.sound.volume) {
                this.soundfile.effectiveVolume = data.sound.volume;
                this.soundfile.volume = data.sound.volume * getVolume();
            }
            if (oldData.loop != data.sound.loop)
                this.soundfile.loop = data.sound.loop;
            if (oldData.audiofile != data.sound.audiofile) {
                let isPlaying = this.soundfile.playing;
                if (this.soundfile?.playing)
                    this.soundfile.stop();
                if (data.sound.audiofile) {
                    this.soundfile = new foundry.audio.Sound(data.sound.audiofile);
                    //this.soundfile.src = data.sound.audiofile;
                    this.soundfile.load({ autoplay: isPlaying, autoplayOptions: { loop: data.sound.loop, volume: data.sound.volume } });
                } else
                    this.soundfile = null;
            }
        }

        await this.object.setFlag('monks-enhanced-journal', 'sound', data.sound);
        this.submitting = true;
    }
}