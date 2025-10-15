export class MEJFontHelper {
    static loadFonts() {
        const FontConfigImpl = foundry.applications.settings.menus.FontConfig;
        FontConfigImpl.loadFont('Anglo Text', {
            editor: true,
            fonts: [
                {
                    urls: [
                        'modules/monks-enhanced-journal/fonts/anglotext-webfont.woff2',
                    ],
                },
            ],
        });

        FontConfigImpl.loadFont('Bookinsanity', {
            editor: true,
            fonts: [
                {
                    urls: [
                        'modules/monks-enhanced-journal/fonts/Bookinsanity/Bookinsanity.otf',
                    ],
                },
                {
                    urls: [
                        'modules/monks-enhanced-journal/fonts/Bookinsanity/BookinsanityBold.otf',
                    ],
                    weight: 700,
                },
                {
                    urls: [
                        'modules/monks-enhanced-journal/fonts/Bookinsanity/BookinsanityBoldItalic.otf',
                    ],
                    weight: 700,
                    style: 'italic',
                },
                {
                    urls: [
                        'modules/monks-enhanced-journal/fonts/Bookinsanity/BookinsanityItalic.otf',
                    ],
                    style: 'italic',
                },
            ],
        });

        FontConfigImpl.loadFont('DungeonDropCase', {
            editor: true,
            fonts: [
                {
                    urls: [
                        'modules/monks-enhanced-journal/fonts/DungeonDropCase/DungeonDropCase.otf',
                    ],
                },
            ],
        });

        FontConfigImpl.loadFont('Lovers Quarrel', {
            editor: true,
            fonts: [
                {
                    urls: [
                        'modules/monks-enhanced-journal/fonts/loversquarrel-regular-webfont.woff2',
                    ],
                },
            ],
        });

        FontConfigImpl.loadFont('Montserrat', {
            editor: true,
            fonts: [
                {
                    urls: [
                        'modules/monks-enhanced-journal/fonts/Montserrat-Regular.woff2',
                    ],
                },
            ],
        });

        FontConfigImpl.loadFont('MrEaves', {
            editor: true,
            fonts: [
                {
                    urls: [
                        'modules/monks-enhanced-journal/fonts/MrEaves/MrEaves.otf',
                    ],
                },
            ],
        });

        FontConfigImpl.loadFont('Play', {
            editor: true,
            fonts: [
                {
                    urls: [
                        'modules/monks-enhanced-journal/fonts/Play-Regular.woff2',
                    ],
                },
            ],
        });

        FontConfigImpl.loadFont('ScalySans', {
            editor: true,
            fonts: [
                {
                    urls: [
                        'modules/monks-enhanced-journal/fonts/ScalySans/ScalySans.otf',
                    ],
                },
                {
                    urls: [
                        'modules/monks-enhanced-journal/fonts/ScalySans/ScalySansBold.otf',
                    ],
                    weight: 700,
                },
                {
                    urls: [
                        'modules/monks-enhanced-journal/fonts/ScalySans/ScalySansBoldItalic.otf',
                    ],
                    weight: 700,
                    style: 'italic',
                },
                {
                    urls: [
                        'modules/monks-enhanced-journal/fonts/ScalySans/ScalySansItalic.otf',
                    ],
                    style: 'italic',
                },
            ],
        });

        FontConfigImpl.loadFont('ScalySansCaps', {
            editor: true,
            fonts: [
                {
                    urls: [
                        'modules/monks-enhanced-journal/fonts/ScalySans/ScalySansCaps.otf',
                    ],
                },
                {
                    urls: [
                        'modules/monks-enhanced-journal/fonts/ScalySans/ScalySansCapsBold.otf',
                    ],
                    weight: 700,
                },
                {
                    urls: [
                        'modules/monks-enhanced-journal/fonts/ScalySans/ScalySansCapsBoldItalic.otf',
                    ],
                    style: 'italic',
                    weight: 700,
                },
                {
                    urls: [
                        'modules/monks-enhanced-journal/fonts/ScalySans/ScalySansCapsItalic.otf',
                    ],
                    style: 'italic',
                },
            ],
        });
    }
}