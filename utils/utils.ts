// import { headers } from "next/headers";

export const getErrorMessage = (
  error: unknown,
  defaultMessage: string = "Something went wrong"
) => {
  console.error(error);
  let errorMessage = defaultMessage;
  if (error instanceof Error && error.message.length < 100) {
    errorMessage = error.message;
  }
  return errorMessage;
};

// export default async function getBaseURL() {
//   const headerList = await headers();
//   const proto = headerList.get("x-forwarded-proto");
//   const host = headerList.get("x-forwarded-host");
//   const baseURL = `${proto}://${host}`;
//   return baseURL;
// }

export const formatTimestamp = (
  timestamp: string | number | Date,
  format = 1
) => {
  if (!timestamp) return null;

  const date = new Date(timestamp);
  const day = date.getDate().toString().padStart(2, "0");
  const month = date.toLocaleString("default", { month: "long" });
  const year = date.getFullYear();
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12 || 12; // Convert to 12-hour format and handle midnight (0)

  if (format == 2) {
    return `${month} ${day}, ${year}`;
  }
  return `${day} ${month} ${year} • ${hours}:${minutes} ${ampm}`;
};
