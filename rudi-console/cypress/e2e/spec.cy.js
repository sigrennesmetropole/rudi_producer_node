const { validate: uuidValidate, version: uuidVersion } = require('uuid');

describe('My First Test', () => {
    it('Does not do much!', () => {
        expect(true).to.equal(true);
    });
});

describe.skip('Single field filling', () => {
    before(() => {
        cy.visit('/test_page');
    });

    describe('Text Input', () => {
        it('takes typed text as value', () => {
            cy.get('#_text input').type('testing text');
            cy.get('#lang_select').focus();
            cy.window().its('form.fields.text.input_element.value').should('eq', 'testing text');
        });

        it('has undefined value when empty', () => {
            cy.get('#_text input').clear();
            cy.get('#lang_select').focus();
            cy.window().its('form.fields.text.input_element.value').should('be.undefined');
        });
    });

    describe('Generator Input', () => {
        it('generate value', () => {
            cy.get('#_textWithGenerator button').click();
            cy.window()
                .its('form.fields.textWithGenerator.input_element.value')
                .then((value) => {
                    expect(uuidValidate(value) && uuidVersion(value) == 4).to.be.true;
                });
        });
    });

    describe('Dictionary Entry Input', () => {
        it('take value from overalay', () => {
            cy.get('#_dictionaryEntry')
                .find('button')
                .click()
                .then(() => {
                    cy.get('#dictionaryEntry_overlay select').select('fr');
                    cy.get('#dictionaryEntry_overlay textarea').type('Some text to test');
                    cy.get('#dictionaryEntry_overlay button.validate').click();
                    cy.window()
                        .its('form.fields.dictionaryEntry.input_element.value')
                        .should('deep.equal', { lang: 'fr', text: 'Some text to test' });
                });
        });

        it('change value when validated', () => {
            cy.get('#_dictionaryEntry')
                .find('button')
                .click()
                .then(() => {
                    cy.get('#dictionaryEntry_overlay select').select('en');
                    cy.get('#dictionaryEntry_overlay textarea').clear().type('Some text to test');
                    cy.get('#dictionaryEntry_overlay button.validate').click();
                    cy.window()
                        .its('form.fields.dictionaryEntry.input_element.value')
                        .should('deep.equal', { lang: 'en', text: 'Some text to test' });
                });
        });

        it('take undefined value when text area is emptied', () => {
            cy.get('#_dictionaryEntry')
                .find('button')
                .click()
                .then(() => {
                    cy.get('#dictionaryEntry_overlay select').select('fr');
                    cy.get('#dictionaryEntry_overlay textarea').clear();
                    cy.get('#dictionaryEntry_overlay button.validate').click();
                    cy.window().its('form.fields.dictionaryEntry.input_element.value').should('be.undefined');
                });
        });
    });

    describe('Select', () => {
        it('take a value', () => {
            cy.get('#_select select').select('select 1').should('have.value', 'select 1');
            cy.window().its('form.fields.select.input_element.value').should('equal', 'select 1');
        });

        it('take an other value', () => {
            cy.get('#_select select').select('select_3').should('have.value', 'select_3');
            cy.window().its('form.fields.select.input_element.value').should('equal', 'select_3');
        });

        it('reset to empty', () => {
            cy.get('#_select select').select('default').should('have.value', 'default');
            cy.window().its('form.fields.select.input_element.value').should('be.undefined');
        });
    });

    describe('Date', () => {
        it('should have value', () => {
            cy.get('#_date input').type('2001-12-25');
            cy.get('#lang_select').focus();
            cy.window().its('form.fields.date.input_element.value').should('eq', '2001-12-25');
        });
    });

    describe('Integer', () => {
        it('should have value (integer)', () => {
            cy.get('#_integer input').type('105');
            cy.get('#lang_select').focus();
            cy.window().its('form.fields.integer.input_element.value').should('eq', 105);
        });

        it('should have value (decimal)', () => {
            cy.get('#_integer input').clear().type('105.3').blur().should('have.value', '105');
            cy.get('#lang_select').focus();
            cy.window().its('form.fields.integer.input_element.value').should('eq', 105);
        });
    });

    describe('Checkbox', () => {
        it('should have value', () => {
            cy.get('#_checkbox input').should('not.be.checked');
            cy.window().its('form.fields.checkbox.input_element.value').should('be.undefined');
            cy.get('#_checkbox input').check().should('be.checked');
            cy.window().its('form.fields.checkbox.input_element.value').should('eq', true);
            cy.get('#_checkbox input').uncheck().should('not.be.checked');
            cy.get('#_checkbox input').should('not.be.checked');
            cy.window().its('form.fields.checkbox.input_element.value').should('be.undefined');
        });
    });
});

describe.skip('Bindings', () => {
    before(() => {
        cy.visit('/test_page');
    });

    function isHide(id) {
        cy.get(`#_${id}`).should('have.css', 'display', 'none');
        cy.window().its(`form.fields.${id}.input_element.value`).should('be.undefined');
    }

    function isDisplayed(id) {
        cy.get(`#_${id}`).should('have.css', 'display', 'block');
    }

    function hasValue(id, value) {
        cy.get(`#_${id}`).should('have.css', 'display', 'block');
        cy.window().its(`form.fields.${id}.input_element.value`).should('eq', value);
    }

    it('Default display and values', () => {
        cy.visit('/test_page');

        cy.get('#_master select').should('have.value', 'default');
        isDisplayed('master');
        isHide('b1_1');
        isHide('b1_2');
        isHide('b2_1');
        isHide('b2_2');
        isHide('b2_3');
    });

    it('value with no bindings', () => {
        cy.get('#_master select').select('noBinding');
        hasValue('master', 'noBinding');
        isHide('b1_1');
        isHide('b1_2');
        isHide('b2_1');
        isHide('b2_2');
        isHide('b2_3');
    });

    it('binding1 display', () => {
        cy.get('#_master select').select('binding1').should('have.value', 'binding1');
        isDisplayed('b1_1');
        isDisplayed('b1_2');
        isHide('b2_1');
        isHide('b2_2');
        isHide('b2_3');
    });

    it('binding1 set values', () => {
        cy.get('#_b1_1 input').type('value for binded field 1');
        cy.get('#lang_select').focus();
        hasValue('b1_1', 'value for binded field 1');
        cy.get('#_b1_2 input').type('value for binded field 2');
        cy.get('#lang_select').focus();
        hasValue('b1_2', 'value for binded field 2');
    });

    it('switch binding2', () => {
        cy.get('#_master select').select('binding2').should('have.value', 'binding2');
        isHide('b1_1');
        isHide('b1_2');
        isDisplayed('b2_1');
        isDisplayed('b2_2');
        isDisplayed('b2_3');
    });

    it('binding2 set values', () => {
        cy.get('#_b2_1 input').type('value for binded field 1');
        cy.get('#lang_select').focus();
        hasValue('b2_1', 'value for binded field 1');
        cy.get('#_b2_2 input').type('23');
        cy.get('#lang_select').focus();
        hasValue('b2_2', 23);
        cy.get('#lang_select').focus();
        cy.get('#_b2_3 input').type('1995-01-01');
        cy.get('#lang_select').focus();
        hasValue('b2_3', '1995-01-01');
    });

    it('switch to noBinding', () => {
        cy.get('#_master select').select('noBinding');
        hasValue('master', 'noBinding');
        isHide('b1_1');
        isHide('b1_2');
        isHide('b2_1');
        isHide('b2_2');
        isHide('b2_3');
    });
});

describe.skip('List Elements', () => {
    describe('Select List', () => {
        it('should have value', () => {
            cy.get('#_selectList select').select('option_1');
            cy.window().its('form.fields.selectList.input_element.value').should('deep.equal', ['option_1']);
            cy.get('#_selectList select').select('option_3');
            cy.window().its('form.fields.selectList.input_element.value').should('deep.equal', ['option_1', 'option_3']);
            cy.get('#_selectList select').select('option_4');
            cy.window().its('form.fields.selectList.input_element.value').should('deep.equal', ['option_1', 'option_3', 'option_4']);
        });

        it('can remove first value', () => {
            cy.get('#_selectList div.list_display div.item').eq(0).find('div.item_remove').click();
            cy.window().its('form.fields.selectList.input_element.value').should('deep.equal', ['option_3', 'option_4']);
        });

        it('add an other value', () => {
            cy.get('#_selectList select').select('option_2');
            cy.window().its('form.fields.selectList.input_element.value').should('deep.equal', ['option_3', 'option_4', 'option_2']);
        });

        it('remove second value', () => {
            cy.get('#_selectList div.list_display div.item').eq(1).find('div.item_remove').click();
            cy.window().its('form.fields.selectList.input_element.value').should('deep.equal', ['option_3', 'option_2']);
        });
    });

    describe('Dictionary Entry List', () => {
        it('can take one value', () => {
            // Fill
            cy.get('#_dictionaryEntryList')
                .find('button')
                .eq(0)
                .click()
                .then(() => {
                    cy.get('#dictionaryEntryList_overlay select').select('fr');
                    cy.get('#dictionaryEntryList_overlay textarea').type('Some text to test');
                    cy.get('#dictionaryEntryList_overlay button.validate').click();
                    cy.window()
                        .its('form.fields.dictionaryEntryList.input_element.value')
                        .should('deep.equal', [{ lang: 'fr', text: 'Some text to test' }]);
                });
        });

        it('can take a list of value', () => {
            // Fill
            cy.get('#_dictionaryEntryList')
                .find('button')
                .eq(0)
                .click()
                .then(() => {
                    cy.get('#dictionaryEntryList_overlay select').select('en');
                    cy.get('#dictionaryEntryList_overlay textarea').type('Some text to test');
                    cy.get('#dictionaryEntryList_overlay button.validate').click();
                    cy.window()
                        .its('form.fields.dictionaryEntryList.input_element.value')
                        .should('deep.equal', [
                            { lang: 'fr', text: 'Some text to test' },
                            { lang: 'en', text: 'Some text to test' }
                        ]);
                });
        });
    });
});
