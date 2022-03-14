import React, { useState } from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import PropTypes from 'prop-types';
import { Check, ExclamationTriangleFill } from 'react-bootstrap-icons';

/**
 * GenericModal component
 * param {*} param0 (token hooks)
 * @return {ReactNode} GenericModal html component
 */
export default function GenericModal({ visible, toggle, options }) {
  return (
    <>
      <Modal show={visible} onHide={toggle}>
        <Modal.Header closeButton>
          <Modal.Title>
            {options.type === 'success' && <Check color="green" />}
            {options.type === 'error' && <ExclamationTriangleFill color="red" />}
            {options.title}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {options.text &&
            options.text.map((text, i) => {
              return <p key={`text-${i}`}>{text}</p>;
            })}
        </Modal.Body>
        <Modal.Footer>
          {options.buttons &&
            options.buttons.map((buttonOption, i) => {
              return (
                <Button
                  key={i}
                  variant="primary"
                  onClick={() => {
                    buttonOption.action();
                    toggle();
                  }}
                >
                  {buttonOption.text}
                </Button>
              );
            })}
        </Modal.Footer>
      </Modal>
    </>
  );
}
GenericModal.propTypes = {
  visible: PropTypes.bool,
  toggle: PropTypes.func,
  options: PropTypes.object,
};

export const useGenericModal = () => {
  const [visible, setVisible] = useState(false);
  /**
   * toggle l'affichage de la modal
   * @return {void}
   */
  function toggle() {
    setVisible(!visible);
  }
  return { toggle, visible };
};

export const useGenericModalOptions = () => {
  const [options, setOptions] = useState({});
  /**
   * change la valeur des options
   * @param {*} param nouvelles options
   * @return {void}
   */
  function changeOptions(param) {
    setOptions(param);
  }
  return { changeOptions, options };
};