"use client";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { VectorizeDatabase } from "@/actions/lang/action";
import { getRepositoryUrls } from "@/actions/repo/action";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { TextToObj } from "@/actions/gptobj/page";
import { Loader2 } from "lucide-react";
import { fetchReadme } from "@/actions/repo/action";
import { GetResults } from "@/actions/lang/action";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function Dashboard() {
  const [GHurl, SetGHurl] = useState("");
  const [ProjectReqs, SetProjectReqs] = useState("");
  const [state, Setstate] = useState("Vectorizing Database");
  const [loadingGH, SetLoadingGH] = useState(false);
  const [loadingRepo, SetloadingRepo] = useState(false);
  const [repoData, SetrepoData] = useState(null);
  const [summaryData, SetsummaryData] = useState(null);
  const [recommendedRepo, SetrecommendedRepo] = useState("");
  const [recObj, setrecObj] = useState(null);

  const fetchRead = async () => {
    try {
      SetrepoData(null);
      SetloadingRepo(true);

      let responseSummary = await GetResults(
        `The user is trying to make add this feature: ${ProjectReqs} using an open source project on github, write a summary of what will be compatible and will work with this project, explaining the compatiblity for each project`,
        "Repo"
      );

      SetsummaryData(responseSummary);

      let res = await getRepositoryUrls(ProjectReqs, responseSummary);

      await fetchReadme(res);

      SetrepoData(res);

      // Use responseSummary directly here instead of summaryData
      let responseRepos = await GetResults(
        `The user is trying to make add this feature: ${ProjectReqs} with the compatible recommended tech stack being ${responseSummary}, list open source projects user can use with the proper github link`,
        "Readme"
      );

      let convert = await TextToObj(responseRepos);
      setrecObj(JSON.parse(convert));
      console.log(convert);
    } catch (error) {
      console.log(error);
    } finally {
      SetloadingRepo(false);
    }
  };

  const clickVectorized = async () => {
    console.log(GHurl, "url");
    if (GHurl.length > 0) {
      SetLoadingGH(true);
      try {
        console.log("sending vectorized request");
        await VectorizeDatabase(GHurl);
      } catch (error) {
        // Handle any errors here
        console.error("Error:", error);
      } finally {
        SetLoadingGH(false); // This will be executed whether there is an error or not
      }
    }
  };
  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-gray-900 text-white py-4 px-6">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Project Recommender</h1>
          <nav>
            <ul className="flex space-x-4">
              <li></li>
              <li></li>
              <li></li>
            </ul>
          </nav>
        </div>
      </header>
      <main className="flex-1 bg-gray-100 py-12 px-6">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold mb-8">
            Vectorize Your GitHub Repository
          </h2>
          <div className="bg-white shadow-md rounded-lg p-8 mb-8">
            <h3 className="text-xl font-bold mb-4">Input Github Repo</h3>
            <div className="flex items-center space-x-4">
              <input
                className="flex-1 border border-black rounded-md px-2 py-1"
                placeholder="Enter GitHub repository URL"
                type="text"
                value={GHurl}
                onChange={(e) => SetGHurl(e.target.value)}
              />
              {loadingGH ? (
                <Button disabled>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Vectorizing...
                </Button>
              ) : (
                <Button onClick={clickVectorized}>Vectorize</Button>
              )}
            </div>
          </div>
          <div className="bg-white shadow-md rounded-lg p-8">
            <h3 className="text-xl font-bold mb-4">Input Feature</h3>
            <div className="grid my-1">
              <div>
                <Label htmlFor="project-name">Project Feature</Label>
                <input
                  className="border w-full rounded-md px-2 py-1"
                  id="project-name"
                  type="text"
                  value={ProjectReqs}
                  onChange={(e) => SetProjectReqs(e.target.value)}
                />
              </div>
            </div>
            {loadingRepo ? (
              <Button disabled>
                <Loader2 className="my-2 mr-2 h-4 w-4 animate-spin" />
                {state}
              </Button>
            ) : (
              <Button className="mt-6" type="submit" onClick={fetchRead}>
                Submit
              </Button>
            )}
          </div>

          <div>
            <AlertDialog>
              <AlertDialogTrigger className="bg-white rounded-lg my-5 w-[15rem] h-[5rem]]">
                View Project Query
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Project Summary Used in Query
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {summaryData || "Project Query will show here"}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogAction>Cool</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Accordion
              className="bg-white rounded-lg my-5"
              type="single"
              collapsible
            >
              <AccordionItem value="item-1">
                <AccordionTrigger>
                  Repos the Agent is searching through...
                </AccordionTrigger>
                <AccordionContent>
                  {repoData &&
                    repoData.map((url, index) => (
                      <li key={index} className="mb-2">
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline"
                        >
                          {url}
                        </a>
                      </li>
                    ))}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          <div className="bg-white shadow-md rounded-lg p-8 mt-8">
            <div>
              <h1 className="text-3xl font-bold mb-4">Projects</h1>
              {recObj && (
                <ul className="divide-y divide-gray-200">
                  {recObj &&
                    recObj?.projects?.map((project, index) => (
                      <li key={index} className="py-4">
                        <h2 className="text-xl font-semibold mb-2">
                          {project.name}
                        </h2>
                        <p className="text-gray-700 mb-2">
                          {project.description}
                        </p>
                        <a
                          href={project.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline"
                        >
                          GitHub Link
                        </a>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </main>
      <footer className="bg-gray-900 text-white py-4 px-6">
        <div className="container mx-auto flex justify-between items-center">
          <p>© 2023 Project Recommender. All rights reserved.</p>
          <nav>
            <ul className="flex space-x-4">
              <li>
                <Link className="hover:underline" href="#">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link className="hover:underline" href="#">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function StarIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
