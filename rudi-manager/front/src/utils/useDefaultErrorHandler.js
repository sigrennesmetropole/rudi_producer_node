import React from 'react';
import { ModalContext, DefaultErrorOption } from '../components/modals/ModalContext';

/**
 * defaultErrorHandler hooks
 * @return {*} defaultErrorHandler hooks
 */
export default function useDefaultErrorHandler() {
  const { changeOptions, toggle } = React.useContext(ModalContext);
  const errorHandler = (err) => {
    console.error(err);
    const options = DefaultErrorOption;
    if (err.response) {
      if (err.response.data && err.response.data.message) {
        options.text = [`${err.response.data.message}`];
        if (err.response.data.moreInfo && err.response.data.moreInfo.message) {
          options.text.push(`${err.response.data.moreInfo.message}`);
        }
      } else {
        options.text = [`${err.response.data}`];
      }
    } else {
      options.text = [`${err.message}`];
    }
    changeOptions(options);
    toggle();
  };

  return {
    defaultErrorHandler: errorHandler,
  };
}
