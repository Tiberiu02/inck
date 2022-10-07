export const StrokeAvroSchema = {
  name: "Stroke",
  type: "record",
  namespace: "io.inck",
  fields: [
    {
      name: "id",
      type: "string",
    },
    {
      name: "deserializer",
      type: "string",
    },
    {
      name: "zIndex",
      type: "float",
    },
    {
      name: "timestamp",
      type: "float",
    },
    {
      name: "width",
      type: "float",
    },
    {
      name: "color",
      type: {
        type: "array",
        items: "float",
      },
    },
    {
      name: "data",
      type: {
        type: "array",
        items: "float",
      },
    },
  ],
};
