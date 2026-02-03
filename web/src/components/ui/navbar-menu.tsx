"use client";
import React, { useState, createContext, useContext } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { cn } from "@/lib/utils";
import Link from "next/link";

const MenuContext = createContext<{
  active: string | null;
  setActive: React.Dispatch<React.SetStateAction<string | null>>;
}>({
  active: null,
  setActive: () => {},
});

export const Menu = ({
  setActive,
  children,
}: {
  setActive: React.Dispatch<React.SetStateAction<string | null>>;
  children: React.ReactNode;
}) => {
  const [active, setActiveState] = useState<string | null>(null);
  return (
    <MenuContext.Provider value={{ active, setActive: setActiveState }}>
      <nav
        onMouseLeave={() => setActiveState(null)} // resets the state
        className="relative rounded-full border border-transparent dark:bg-black dark:border-white/[0.2] bg-white shadow-input flex justify-center space-x-4 px-8 py-6"
      >
        {children}
      </nav>
    </MenuContext.Provider>
  );
};

export const MenuItem = ({
  setActive,
  active,
  item,
  children,
}: {
  setActive: React.Dispatch<React.SetStateAction<string | null>>;
  active: string | null;
  item: string;
  children?: React.ReactNode;
}) => {
  const { setActive: setActiveFromContext } = useContext(MenuContext);
  return (
    <div onMouseEnter={() => setActiveFromContext(item)} className="relative">
      <motion.p
        transition={{ duration: 0.3 }}
        className="cursor-pointer text-black hover:opacity-[0.9] dark:text-white font-medium"
      >
        {item}
      </motion.p>
      {active !== null && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{
            type: "spring",
            mass: 0.5,
            damping: 11.5,
            stiffness: 100,
            restDelta: 0.001,
            restSpeed: 0.001,
          }}
        >
          {active === item && (
            <div className="absolute top-[calc(100%_+_1.2rem)] left-1/2 transform -translate-x-1/2 pt-4">
              <motion.div
                transition={{
                  type: "spring",
                  mass: 0.5,
                  damping: 11.5,
                  stiffness: 100,
                  restDelta: 0.001,
                  restSpeed: 0.001,
                }}
                layoutId="active" // layoutId ensures smooth animation
                className="bg-white dark:bg-black backdrop-blur-sm rounded-2xl overflow-hidden border border-black/[0.2] dark:border-white/[0.2] shadow-xl"
              >
                <motion.div
                  layout // layout ensures smooth animation
                  className="w-max h-full p-4"
                >
                  {children}
                </motion.div>
              </motion.div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export const ProductItem = ({
  title,
  description,
  href,
  src,
}: {
  title: string;
  description: string;
  href: string;
  src: string;
}) => {
  return (
    <Link href={href} className="flex space-x-2">
      <img
        src={src}
        width={140}
        height={70}
        alt={title}
        className="flex-shrink-0 rounded-md shadow-2xl"
      />
      <div>
        <h4 className="text-xl font-bold mb-1 text-black dark:text-white">
          {title}
        </h4>
        <p className="text-neutral-700 text-sm max-w-[10rem] dark:text-neutral-300">
          {description}
        </p>
      </div>
    </Link>
  );
};

export const HoveredLink = ({ children, ...rest }: any) => {
  return (
    <Link
      {...rest}
      className="text-neutral-700 dark:text-neutral-200 hover:text-black"
    >
      {children}
    </Link>
  );
};