import { FileTypes } from "@inck/common-types/Files";
import JSZip from "jszip";
import { useState } from "react";
import { NoteToPdf } from "../../../canvas/PDF/PdfExport";
import { Spinner } from "../../Spinner";
import { FileTree } from "../types";
import { Modal, ModalButtons, ModalTitle } from "../../common/Modals";
import download from "downloadjs";

type ExportFilesModalProps = {
  selectedFiles: FileTree;
  onCancel: () => void;
  onSuccess: () => void;
};

export function ExportFilesModal({ selectedFiles = {}, onCancel, onSuccess }: ExportFilesModalProps) {
  const [exporting, setExporting] = useState(false);

  const downloadNotes = async () => {
    const files = Object.values(selectedFiles);

    const exportFiles = async (root, files) => {
      for (const file of files) {
        if (file.type == FileTypes.NOTE) {
          const bytes = await NoteToPdf(file.fileId);
          root.file(file.name + ".pdf", bytes);
        } else if (file.type == FileTypes.FOLDER) {
          const newFolder = root.folder(file.name);
          await exportFiles(newFolder, file.children);
        }
      }
    };

    setExporting(true);

    if (files.length == 1 && files[0].type == FileTypes.NOTE) {
      const bytes = await NoteToPdf(files[0].fileId);
      download(bytes, files[0].name + ".pdf", "application/pdf");
    } else {
      let zip = new JSZip();
      await exportFiles(zip, files);
      const zipBytes = await zip.generateAsync({ type: "blob" });

      download(zipBytes, `Inck Notes Export.zip`, "application/zip");
    }

    setExporting(false);
    onSuccess();
  };

  return (
    <Modal onCancel={onCancel}>
      <ModalTitle>Export to PDF</ModalTitle>

      <div className="text-center my-8">Would you like to download selected notes as PDF?</div>

      <div className="h-12 flex flex-col justify-end w-full">
        {exporting ? (
          <Spinner className="h-12" />
        ) : (
          <ModalButtons onCancel={onCancel} onSubmit={downloadNotes} submitText="Download" />
        )}
      </div>
    </Modal>
  );
}
