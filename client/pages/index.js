import Head from "next/head";
import Link from "next/link";
import { FaPen, FaGlobe, FaCar, FaShippingFast, FaPlane, FaMobileAlt, FaArrowDown } from "react-icons/fa";
import { MdOutlineAccountCircle } from "react-icons/md";
import React, { useState } from "react";
import Image from "next/image";

function OpenNoteBtn() {
  const [noteId, setNoteId] = useState("");
  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        if (noteId) window.location = "/free-note/" + noteId;
      }}
      className="flex flex-row gap-4 items-center justify-between border-2 border-primary bg-white rounded-xl w-full"
    >
      <input
        required
        name="code"
        className="placeholder-gray-400 text-gray-700 mx-3 w-full"
        placeholder="Code"
        onChange={e => setNoteId(e.target.value)}
      />
      <button className="flex flex-row items-center bg-primary hover:bg-primary-dark duration-200 px-5 h-full py-[0.55rem] border-0 w-full justify-center -mr-1 -my-[2px] rounded-r-xl">
        Open&nbsp;note
      </button>
    </form>
  );
}

function CreateNoteBtn({ className }) {
  const chars = "abcdefghijklmnopqrstufwxyzABCDEFGHIJKLMNOPQRSTUFWXYZ1234567890";
  const len = 6;
  const id = Array(6)
    .fill(0)
    .map(x => chars[Math.floor(Math.random() * chars.length)])
    .join("");
  return (
    <button
      onClick={() => (window.location = "/free-note/" + id)}
      className={`${className} max-w-lg flex flex-row items-center justify-center bg-primary hover:bg-primary-dark duration-200 py-3 px-6 rounded-xl w-full`}
    >
      Create new note
      <FaPen className="mr-1 ml-7" />
    </button>
  );
}

function SignInBtn({ className }) {
  return (
    <Link href="/auth">
      <button
        className={
          "flex flex-row items-center justify-center bg-primary hover:bg-primary-dark duration-200 py-3 px-6 rounded-xl lg:w-104 w-full max-w-lg " +
          className
        }
      >
        Sign in <MdOutlineAccountCircle className="mr-1 ml-3" />
      </button>
    </Link>
  );
}

function Item({ title, text, Icon }) {
  return (
    <div className="flex flex-col items-center">
      <Icon className="text-6xl text-primary" />
      <h2 className="text-xl font-bold pt-4 text-center">{title}</h2>
      <p className="w-56 text-center pt-4">{text}</p>
    </div>
  );
}

function Roadmap({ currentStage, stages }) {
  return (
    <div className="w-full p-10 overflow-auto no-scrollbar">
      <div className="flex flex-row p-10 pl-12">
        {stages.map(([title, ...features], ix) => {
          const stageId = ix + 1;
          const stageSuf = ["st", "nd", "rd"][ix % 10] || "th";
          const status = stageId == currentStage ? 1 : stageId < currentStage ? 0 : 2;
          const lastStage = stageId == stages.length;

          const bgColor = ["bg-primary", "bg-yellow-500", "bg-gray-400"][status];
          const textColor = ["text-primary", "text-yellow-500", "text-gray-400"][status];

          const iconName = ["done", "magic_button", "schedule"][status];
          const icon = (
            <span class={`material-symbols-outlined mr-2 mt-1 ${textColor} rounded-full text-md`}>{iconName}</span>
          );

          return (
            <div className="flex flex-col">
              <div className="flex flex-row w-80 items-center">
                <div
                  className={`${bgColor} rounded-full justify-self-center text-white w-full max-w-[4rem] h-16 flex items-center justify-center`}
                >
                  <span class="material-symbols-outlined text-4xl">{iconName}</span>
                </div>
                <div className={`h-2 w-full justify-self-center ${bgColor} -ml-2 mr-2 rounded-full`}></div>
              </div>

              <div className={`mt-5 mr-10 ${!lastStage && "mb-10"}`}>
                <div className="text-xl text-gray-400">{stageId + stageSuf} stage</div>
                <div className="text-4xl">{title}</div>
                <ul className="text-lg mt-4">
                  {features.map(feature => (
                    <li className="flex items-center leading-none mt-1">
                      {icon} {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div>
      <Head>
        <title>Inck</title>
        <meta name="description" content="The only ink that you will ever need" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <div className="w-full flex flex-col items-center min-h-[100vh] px-10 py-20 justify-center bg-notes bg-cover">
          <div className="lg:max-w-4xl xl:max-w-6xl 2xl:max-w-7xl w-full">
            <div className="relative max-w-fit">
              <div className="absolute -inset-4 bg-white blur-lg"></div>
              <p className="text-6xl sm:text-8xl font-cursive blur-0 font-bold">Welcome to Inck</p>
            </div>
            <div className="h-2 w-20 bg-primary rounded-xl my-10" />
            <div className="relative max-w-fit">
              <div className="absolute -inset-2 bg-white blur-md"></div>
              <p className="text-4xl sm:text-5xl font-cursive italic blur-0">
                the only ink you&apos;ll ever&nbsp;need&nbsp;&nbsp;
              </p>
            </div>
            <div className="flex flex-col gap-8 text-lg sm:text-3xl font-round text-white">
              <div className="flex flex-col lg:flex-row mt-20 ">
                <CreateNoteBtn className="" />
                <SignInBtn className="mt-4 lg:mt-0 lg:ml-4" />
              </div>
            </div>
          </div>
        </div>

        <div className="font-round w-full flex flex-col items-center py-20 px-10 min-h-[100vh] justify-center bg-white border-t-4 drop-shadow-md border-t-gray-100">
          <div className="flex flex-col items-center max-w-md lg:max-w-4xl xl:max-w-6xl 2xl:max-w-7xl lg:w-full">
            <h1 className="text-4xl text-center">The Google Docs of hand-written notes</h1>
            <div className="grid sm:grid-cols-2 mt-32 gap-20">
              <Item
                title="Live collaboration"
                Icon={FaGlobe}
                text="Collaborating in real time with your friends is as easy as sharing a link."
              />
              <Item
                title="Fast and reliable"
                Icon={FaShippingFast}
                text="Enjoy native performace thanks to the most advanced web technologies."
              />
              <Item title="Access from anywhere" Icon={FaPlane} text="Take and review notes wherever you are." />
              <Item title="Cross-platform" Icon={FaMobileAlt} text="All you need is a web browser." />
            </div>
          </div>
        </div>

        <div className="font-round w-full flex flex-col items-center py-32 px-10 justify-center bg-gray-100">
          <div className="flex flex-col items-center w-[80vw] mb-20">
            <p className="text-5xl text-black mb-2">Made at EPFL</p>
            <p className="text-2xl text-gray-700 italic">For students, by students</p>
          </div>

          <img className="max-w-lg w-full drop-shadow-lg" src="/Logo_EPFL.svg" />
        </div>

        <div className="font-round w-full flex flex-col items-center py-20 min-h-[100vh] justify-center bg-white drop-shadow-md-vertical border-t-gray-100">
          <div className="flex flex-col items-center w-full">
            <h1 className="text-5xl text-center mb-20">Roadmap</h1>
            <Roadmap
              currentStage={3}
              stages={[
                ["Prototype", "Simple web-based note taking app", "Infinite scrollable canvas", "Full screen mode"],
                [
                  "MVP",
                  "Ultra-smooth writing experience",
                  "Live collaboration",
                  "Tool wheel, more pens & colors",
                  "Pen-following menu",
                  "Selection Tool",
                ],
                [
                  "Beta release",
                  "PDF import",
                  "User accounts",
                  "File Explorer",
                  "Optimized tool menu",
                  "Shape recognition",
                ],
                ["Lecture Mode", "Lecture mode for professors", "Real time questions", "Picture-in-picture notes"],
                ["Progressive Web App", "Ability to save the app locally", "Offline capabilities"],
                [
                  "More Features",
                  "Typed text input",
                  "Image input",
                  "Lecture voice recording",
                  "PDF export",
                  "Hyperlinks",
                  "Smart gestures",
                  "etc.",
                ],
                [
                  "Ultimate Note-Taking App",
                  "Reduced input latency through pen prediction",
                  "Text recognition, automatic table of content",
                  "Moodle integration",
                ],
                ["More than hand written notes", "Desktop toolbar", "Shapes, arrows", "Sticky notes", "Tables"],
              ]}
            />
          </div>
        </div>

        <div className="font-round w-full flex flex-col items-center py-20 px-0 justify-center bg-gray-100">
          <div className="flex flex-col items-center w-[80vw]">
            <p className="text-2xl mt-4 text-gray-900 italic mb-2">Still not convinced?</p>
            <h1 className="text-6xl text-center">Try it out</h1>
            <FaArrowDown className="text-5xl text-primary mt-12 mb-4" />
            <iframe className="w-full h-[80vw] sm:h-[50vw] rounded-xl shadow-lg" src="/free-note/demo" />
          </div>

          <p className="mt-20 -mb-20 py-5">© Inck team 2022</p>
        </div>
      </main>
    </div>
  );
}
