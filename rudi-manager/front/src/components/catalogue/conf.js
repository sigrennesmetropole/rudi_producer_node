export const filterConf = [
  {
    name: 'theme',
    text: 'Thème :',
    values: [],
    toFilterParam: (elem) => {
      return { theme: `"${elem?.theme}"` }
    },
  },
  {
    name: 'keywords',
    text: 'Mots-clés :',
    values: [],
    toFilterParam: (elem) => {
      return { keywords: `"${elem?.keywords}"` }
    },
  },
  {
    name: 'producer',
    displayName: 'organization_name',
    text: 'Source :',
    values: [],
    toFilterParam: (elem) => {
      return { 'producer.organization_name': `"${elem.producer?.organization_name}"` }
    },
  },
  // {
  //   name: 'resource_languages',
  //   text: 'Langage :',
  //   values: [],
  //   toFilterParam: (elem) => {
  //     return { resource_languages: `"${elem?.resource_languages}"` };
  //   },
  // },
]
