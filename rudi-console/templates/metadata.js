let serviceForm = {
    htmlJsonTemplate: [
        { tag: "div", class: ["row", "no-gap", "align-center"], children:[
            { tag: "div", class: ["row", "flex"],  children: [
                { id: "@media_name", tag: "text-input",  class: ["col","s4","m4"]   },
                { id: "@url",        tag: "text-input",  class: ["col","s4","m4"],  attr: { required: true } }
            ]},
            { id: "@submit_btn",     tag: "action-icon", textContent: "check" }
        ]},
    ],
    focusElement: "media_name",
    submitBtn: "submit_btn",
    submitTemplate: {
        media_name: "media_name",
        connector: {
            url: "url"
        }
    },
    displayTemplate: [
        { id: "media_name", tag: "p", class: ["card-title"],  },
        { id: "url",        tag: "a", class: ["card-subtitle"], attr: { tabindex: "-1" } }
    ],
    displayFragmentSet: {
        url:          { textContent: "$url",       attr: { href: "$url" } }
    }

}

module.exports = {
    htmlJsonTemplate: [
        { tag: "form-header", class:["row"], children: [
            { id: "title",          tag: "h1" },
            { id: "@header_actions", tag: "div" }
        ]},
        { tag: "hr" },
        { tag: "form-body", children: [
            { tag:"form-section", class:["row"], children: [
                { id: "media",      tag: "h1"           },
                { tag: "div", class:["row"], attr: { required: true }, children: [
                    { id: "@files",      tag: "file-input",  class: ["col","s4"] },
                    { tag: "form-section", attr: { required: true }, class: ["row"], children: [
                        { id: "@restricted_access",      tag: "select-input",    class: ["col","s4","m4"]  },
                        { id: "@gdpr_sensitive",         tag: "checkbox-input",  class: ["col","s4","m4"], attr: { disabled: true }  },
                        // { id: "@restricted_access_bool", tag: "checkbox-input",  class: ["col","s4","m4"], attr: { disabled: true }  }
                    ]},
                    { id: "@services",   tag: "form-cards-block",  class: ["col","s4", "cardgrid"],
                        init: {
                            // Array Like object, allow to order argument given to the setTemplate method
                            setTemplate: { length: 1, 0: serviceForm }
                        }
                    }
                ]}
            ]},
            { tag:"form-section", class:["row"], children: [
                { id: "global",               tag: "h1"           },
                { id: "@global_id",           tag: "text-input",       class: ["col","s4","m4"],  attr: { disabled: true, required: true }           },
                { id: "@local_id",            tag: "text-input",       class: ["col","s4","m4"]   },
                { id: "@doi",                 tag: "text-input",       class: ["col","s4","m4"]   },
                { id: "@resource_title",      tag: "text-input",       class: ["col","s4","m4"],  attr: { required: true }   },
                { id: "@collection_tag",      tag: "text-input",       class: ["col","s4","m4"]        },
                { id: "@synopsis",            tag: "multi-textarea",   class: ["col","s4"],       attr: { required: true }   },
                { id: "@summary",             tag: "multi-textarea",   class: ["col","s4"],       attr: { required: true }   },
                { id: "@theme",               tag: "select-input",     class: ["col","s4","m4"],  attr: { required: true }   },
                { id: "@keywords",            tag: "datalist-input",   class: ["col","s4","m4"],  attr: { required: true }   },
                { id: "@producer",            tag: "select-input",     class: ["col","s4"],       attr: { required: true }   },
                { id: "@contacts",            tag: "selectm-input",    class: ["col","s4"],       attr: { required: true }   },
                { id: "@resource_languages",  tag: "selectm-input",    class: ["col","s4","m4"]   },
                { tag:"form-section", class:["row"], children: [
                        { id: "temporal_spread",   tag: "h1"           },
                        { id: "@start_date",       tag: "date-input",  class: ["col","s4","m4"]  },
                        { id: "@end_date",         tag: "date-input",  class: ["col","s4","m4"]  }
                ]},
                { tag:"form-section", class:["row"], children: [
                    { id: "dataset_size",         tag: "h1"           },
                    { id: "@numbers_of_records",  tag: "number-input",  class: ["col","s4","m4"]  },
                    { id: "@number_of_fields",    tag: "number-input",  class: ["col","s4","m4"]  }
                ]},
                { tag:"form-section", class:["row"], children: [
                    { id: "dataset_dates",  tag: "h1"           },
                    { id: "@created",       tag: "date-input",  class: ["col","s4","m4"],  attr: { required: true } },
                    { id: "@validated",     tag: "date-input",  class: ["col","s4","m4"]   },
                    { id: "@published",     tag: "date-input",  class: ["col","s4","m4"]   },
                    { id: "@updated",       tag: "date-input",  class: ["col","s4","m4"],  attr: { required: true } },
                    { id: "@deleted",       tag: "date-input",  class: ["col","s4","m4"]   }
                ]},
                { id: "@storage_status", tag: "select-input", class: ["col","s4","m4"], attr: { disabled: true, required: true } }

            ]},
            { tag: "form-section", class: ["row"], children: [
                { id: "access_condition", tag: "h1" },
                { tag: "form-section", class: ["row"], children: [
                    { id: "licence",               tag: "h2" },
                    { id: "@licence_type",         tag: "select-input",    class: ["col","s4","m4"],  attr: { required: true } },
                    { id: "@licence_label",        tag: "select-input",    class: ["col","s4","m4"]   },
                    { id: "@custom_licence_label", tag: "multi-textarea",  class: ["col","s4"]  },
                    { id: "@custom_licence_uri",   tag: "text-input",      class: ["col","s4","m4"]   }
                ]},
                { id: "@usage_constraint",           tag: "multi-textarea",  class: ["col","s4"]  },
                { id: "@bibliographical_reference",  tag: "multi-textarea",  class: ["col","s4"]  },
                { id: "@mandatory_mention",          tag: "multi-textarea",  class: ["col","s4"]  },
                { id: "@access_constraint",          tag: "multi-textarea",  class: ["col","s4"]  },
                { id: "@other_constraints",          tag: "multi-textarea",  class: ["col","s4"]  }
            ]},
            { tag: "form-section", class: ["row"], children: [
                { id: "geography_title",  tag: "h1" } ,
                { id: "@geography",  tag: "map-input",  class: ["col","s4"],  attr: { lat: 48.11285581395178, lng: -1.6777706355499762, zoom: 12} }
            ]},
            { tag: "form-section", class: ["row"], children: [
                { id: "metadata_info",          tag: "h1" } ,
                { id: "@metadata_api_version",  tag: "text-input",     class: ["col","s4"],       attr: { disabled: true, required: true } },
                { id: "@metadata_created",      tag: "date-input",     class: ["col","s4","m4"],  attr: { disabled: true } },
                { id: "@metadata_updated",      tag: "date-input",     class: ["col","s4","m4"],  attr: { disabled: true } },
                { id: "@metadata_validated",    tag: "date-input",     class: ["col","s4","m4"],  attr: { disabled: true } },
                { id: "@metadata_published",    tag: "date-input",     class: ["col","s4","m4"],  attr: { disabled: true } },
                { id: "@metadata_provider",     tag: "select-input",   class: ["col","s4","m4"]   },
                { id: "@metadata_contacts",     tag: "selectm-input",  class: ["col","s4"]   }
            ]}
        ]},
        { tag: "form-footer", children: [
            { id: "@submit_btn", tag: "button" }
        ]}
    ],
    formBindings: {
        licence_type: {
            licence_label:        { STANDARD: { required: true, hidden: false } },
            custom_licence_label: { CUSTOM:   { required: true, hidden: false } },
            custom_licence_uri:   { CUSTOM:   { required: true, hidden: false } }
        }
    },
    submitBtn: "submit_btn",
    submitTemplate: {
        global_id: "global_id",
        local_id: "local_id",
        doi: "doi",
        resource_title: "resource_title",
        synopsis: "synopsis",
        summary: "summary",
        theme: "theme",
        keywords: "keywords",
        producer: "producer",
        contacts: "contacts",
        available_formats: {
            files: "files",
            services: "services"
        },
        restricted_access: "restricted_access",
        resource_languages: "resource_languages",
        dataset_size: {
            numbers_of_records: "numbers_of_records",
            number_of_fields: "number_of_fields"
          },
        temporal_spread: {
            start_date: "start_date",
            end_date: "end_date"
        },
        geography: "geography",
        dataset_dates: {
            created: "created",
            validated: "validated",
            published: "published",
            updated: "updated",
            deleted: "deleted"
        },
        storage_status: "storage_status",
        access_condition: {
            confidentiality: {
                // restricted_access: "restricted_access_bool",
                gdpr_sensitive: "gdpr_sensitive"
            },
            licence: {
                licence_type: "licence_type",
                licence_label: "licence_label",
                custom_licence_label: "custom_licence_label",
                custom_licence_uri: "custom_licence_uri"
            },
            usage_constraint: "usage_constraint",
            bibliographical_reference: "bibliographical_reference",
            mandatory_mention: "mandatory_mention",
            access_constraint: "access_constraint",
            other_constraints: "other_constraints"
        },
        collection_tag: "collection_tag",
        metadata_info: {
            api_version: "metadata_api_version",
            metadata_dates: {
                created: "metadata_created",
                updated: "metadata_updated",
                validated: "metadata_validated",
                published: "metadata_published"
            },
            metadata_provider: "metadata_provider",
            metadata_contacts: "metadata_contacts"
          }
    },
    fragmentSet: {
        fr: {
            title:                      { textContent: "Métadonnée Rudi"                },
            media:                      { textContent: "Ajouter les médias"             },
            global:                     { textContent: "Général"                        },
            temporal_spread:            { textContent: "Étendue temporelle"             },
            dataset_size:               { textContent: "Taille de la donnée"            },
            dataset_dates:              { textContent: "Date de référence"              },
            access_condition:           { textContent: "Contraintes d'accès"            },
            confidentiality:            { textContent: "Confidentialité"                },
            licence:                    { textContent: "Licence"                        },
            geography_title:            { textContent: "Distribution géographique"      },
            metadata_info:              { textContent: "Informations de la métadonnée"  },
            submit_btn:                 { textContent: "Valider"                        },
            global_id:                  { attr: { label: "Identifiant Global",           helper: "Identifiant de la métadonnée dans RUDI"                                       }},
            local_id:                   { attr: { label: "Identifiant local",            helper: "Identifiant de la métadonnée dans le système local du producteur"             }},
            doi:                        { attr: { label: "DOI",                          helper: "Identifiant unique de la métadonnée sur internet"                             }},
            resource_title:             { attr: { label: "Titre de la ressource",        helper: "Nom de la ressource"                                                          }},
            collection_tag:             { attr: { label: "Tag",                          helper: "Un tag empêche un jdd d'être publié sur le portail"                           }},
            synopsis:                   { attr: { label: "Synopsis",                     helper: "Courte description de la ressource"                                           }},
            summary:                    { attr: { label: "Description",                  helper: "Description plus précise de la ressource"                                     }},
            theme:                      { attr: { label: "Thème",                        helper: "Thème le plus adapté pour classifier la ressource"                            }},
            keywords:                   { attr: { label: "Mot clés",                     helper: "Liste de mots-clés qui caractérisent la ressource (séparés par des virgules)"                            }},
            producer:                   { attr: { label: "Producteur de la donnée",      helper: "Organisation qui a produit la donnée"                                         }},
            contacts:                   { attr: { label: "Contact",                      helper: "Liste de personnes référentes pour la donnée"                                 }},
            files:                      { attr: { label: "Fichiers",                     helper: "Liste des formats disponibles pour la donnée"                                 }},
            media_id:                   { attr: { label: "Identifiant du media",         helper1: "Identifiant unique du service"}},
            media_name:                 { attr: { label: "Nom du service",               helper1: "Nom du service"}},
            url:                        { attr: { label: "URL du service",               helper1: "URL pour accéder au service"}},
            resource_languages:         { attr: { label: "Langue de la ressource",       helper: "Liste des langages disponibles dans la ressource"                             }},
            start_date:                 { attr: { label: "Date de début",                helper: "Date de départ de la période de temps dans laquelle s'inscrivent les données" }},
            end_date:                   { attr: { label: "Date de fin",                  helper: "Date de fin de la période de temps dans laquelle s'inscrivent les données"    }},
            numbers_of_records:         { attr: { label: "Nombre d'enregistrements",     helper: "Nombre de valeurs (en général, lignes)"                                       }},
            number_of_fields:           { attr: { label: "Nombre de champs",             helper: "Nombres de propriétés (en général, colonnes)"                                 }},
            created:                    { attr: { label: "Date de création",             helper: "Date de création du jeu de données"                                           }},
            updated:                    { attr: { label: "Date de modification",         helper: "Dernière date de modification du jeu de données"                              }},
            validated:                  { attr: { label: "Date de validation",           helper: "Dernière date de validation du jeu de données"                                }},
            published:                  { attr: { label: "Date de publication",          helper: "Date de publication du jeu de données"                                        }},
            deleted:                    { attr: { label: "Date de supression",           helper: "Date de suppression du jeu de données"                                        }},
            storage_status:             { attr: { label: "Statut du stockage",           helper: "Statut du stockage du jeu de données"                                         }},
            restricted_access:          { attr: { label: "Restriction d'accès",          helper: "Le nom de la clé publique qui chiffre les données"                            }},
            // restricted_access_bool:     { attr: { label: "Restriction d'accès",       helper: "Indique si le jeu de données contient des données restreintes"                }},
            gdpr_sensitive:             { attr: { label: "Sensible au RGPD",             helper: "Indique si le jeu de données contient des informations personnelles"          }},
            licence_type:               { attr: { label: "Type de licence",              helper: "Type de licence"                                                              }},
            licence_label:              { attr: { label: "Nom de la licence",            helper: "Nom de la licence"                                                            }},
            custom_licence_label:       { attr: { label: "Nom de la licence externe",    helper: "Nom de la licence externe"                                                    }},
            custom_licence_uri:         { attr: { label: "URL vers la licence",          helper: "URL vers le texte décrivant la licence"                                       }},
            usage_constraint:           { attr: { label: "Contraintes d'usage",          helper: "Décrit en texte simple les contraintes liées à l'usage de la ressource"       }},
            bibliographical_reference:  { attr: { label: "Reférence bibliographique",    helper: "Information qui doit être cité chaque fois que la donnée est utilisée"        }},
            mandatory_mention:          { attr: { label: "Mention obligatoire",          helper: "Mention devant être citée sur chaque publication qui fait usage de la donnée" }},
            access_constraint:          { attr: { label: "Contrainte d'accès",           helper: "Autres restrictions d'accès"                                                  }},
            other_constraints:          { attr: { label: "Autre contrainte",             helper: "Autres restrictions"                                                          }},
            geography:                  { attr: { label: "Distribution géographique",    helper: "Localisation géographique de la donnée"                                       }},
            metadata_api_version:       { attr: { label: "Version de la métadonnée",     helper: "Numéro de version à 3 nombres X.Y.Z (et mention alpha/beta)"                  }},
            metadata_metadata_dates:    { attr: { label: "Date de référence",            helper: "Dates des actions réalisées sur la métadonnée"                                }},
            metadata_created:           { attr: { label: "Date de création",             helper: "Date de création de la métadonnée"                                            }},
            metadata_updated:           { attr: { label: "Date de modification",         helper: "Dernière date de modification de la métadonnée"                               }},
            metadata_validated:         { attr: { label: "Date de validation",           helper: "Dernière date de validation de la métadonnée"                                 }},
            metadata_published:         { attr: { label: "Date de publication",          helper: "Date de publication de la métadonnée"                                         }},
            metadata_provider:          { attr: { label: "Producteur de la métadonnée",  helper: "Organisation qui a produit la métadonnée"                                     }},
            metadata_contacts:          { attr: { label: "Contact",                      helper: "Liste de personnes référentes pour la métadonnée"                             }},
            services:                   {
                attr: {
                    label: "Services",
                    helper: "Liste des services disponibles pour la donnée"
                },
                init: {
                    // Array like object, allow to define second argument for the setTemplate method
                    setTemplate: {
                        length: 2,
                        1: {
                            media_name: { attr: { label: "Nom du service",        helper1: "Nom du service"}},
                            url:        { attr: { label: "URL du service",        helper1: "URL pour accéder au service"}}
                        }
                    }
                }
            }
        },
        enums: {
            opt_language:                 { init: { setOptions: ["$languages"]      }},
            opt_organizations:            { init: { setOptions: ["$organizations"]      }},
            opt_contacts:                 { init: { setOptions: ["$contacts"]       }},
            synopsis:                     "opt_language",
            summary:                      "opt_language",
            theme:                        { init: { setOptions: ["$themes"]         }},
            keywords:                     { init: { setDataList: ["$keywords"]       }},
            producer:                     "opt_organizations",
            contacts:                     "opt_contacts",
            resource_languages:           "opt_language",
            storage_status:               { init: { setOptions: ["$storagestatus"]  }},
            restricted_access:            { init: { setOptions: ["$publickeys"]      }},
            licence_type:                 { init: { setOptions: ["$licencetypes", true, ]   }},
            licence_label:                { init: { setOptions: ["$licences", true]       }},
            custom_licence_label:         "opt_language",
            usage_constraint:             "opt_language",
            bibliographical_reference:    "opt_language",
            mandatory_mention:            "opt_language",
            access_constraint:            "opt_language",
            other_constraints:            "opt_language",
            metadata_provider:            "opt_organizations",
            metadata_contacts:            "opt_contacts"
        }
    }
}
