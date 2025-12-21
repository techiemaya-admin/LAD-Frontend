"use client";
import React from 'react';

export default function Loader() {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <div className="w-[50px] h-[50px] border-[5px] border-gray-300 border-t-[5px] border-t-blue-500 rounded-full animate-spin" />
      <span className="mt-4 text-lg text-gray-600"></span>
    </div>
  );
}

