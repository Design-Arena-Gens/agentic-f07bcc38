export const metadata = {
  title: "Gas Safety Device Video Generator",
  description: "Generate a 15s promotional video for a Gas Safety Device"
};

import "../styles/globals.css";
import React from "react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
