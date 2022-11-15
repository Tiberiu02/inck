import { useDropzone } from "react-dropzone";

export function PDFDropZone({ setPdfContent, setFileSize }) {
  const { acceptedFiles, getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        const [file] = acceptedFiles;
        setFileSize(file.size);
        setPdfContent(file);
      }
    },
    accept: {
      "application/pdf": [".pdf"],
    },
  });

  const isFileSelected = acceptedFiles.length > 0;

  let dropZoneContent: string;

  if (isDragActive) {
    dropZoneContent = "Drop the files here ...";
  } else if (acceptedFiles.length == 0) {
    dropZoneContent = "Drop file here, or click to select ...";
  } else {
    dropZoneContent = acceptedFiles[0].name;
  }

  return (
    <div
      {...getRootProps({
        className: `rounded-md p-3 border-dashed border-slate-500 border-2 text-sm h-16 italic 
                  ${isFileSelected ? "" : "justify-center"} flex items-center  focus:none hover:bg-slate-100 ${
          isDragActive ? "bg-slate-100" : ""
        }
                  
                  `,
      })}
    >
      <input {...getInputProps()} />
      <p className="truncate text-ellipsis w-72">{dropZoneContent}</p>
    </div>
  );
}
