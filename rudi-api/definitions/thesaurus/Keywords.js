// const mod = 'keywThes'

// -------------------------------------------------------------------------------------------------
// Internal dependencies
// -------------------------------------------------------------------------------------------------
import { Thesaurus } from './Thesaurus.js'

// -------------------------------------------------------------------------------------------------
// Dynamic enum init
// -------------------------------------------------------------------------------------------------

const CODE = 'keywords'
const INIT_VALUES = [
  'agriculture',
  'bike',
  'car',
  'biogaz',
  'building',
  'bus',
  'city',
  'electricity',
  'energy_consommation',
  'gaz',
  'grid',
  'industry',
  'iris',
  'metro',
  'municipality',
  'plu',
  'population',
  'production',
  'research',
  'school',
  'sensor',
  'stop',
  'telecom',
  'transport',
  'waste',
  'wind',
]

export const Keywords = new Thesaurus(CODE, INIT_VALUES)

export default Keywords
