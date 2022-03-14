import React, { useContext } from 'react';
import PropTypes from 'prop-types';
import { GeneralContext } from '../../generalContext';

/**
 * Composant : ThemeDisplay
 * @return {ReactNode}
 */
export default function ThemeDisplay({ value }) {
  const generalConf = useContext(GeneralContext);
  /**
   * get Theme Label
   * @return {String} text to display
   */
  function getLabel() {
    if (generalConf.themeLabel && generalConf.themeLabel[value]) {
      return generalConf.themeLabel[value];
    }
    return value;
  }

  return <span>{getLabel()}</span>;
}
ThemeDisplay.propTypes = {
  value: PropTypes.string,
};
