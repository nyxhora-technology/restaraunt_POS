import React from "react";
import TableFormModal from "../tables/TableFormModal";

const Modal = ({ setIsTableModalOpen }) => (
  <TableFormModal isOpen onClose={() => setIsTableModalOpen(false)} />
);

export default Modal;
