"use server";
import { formatDocumentsAsString } from "langchain/util/document";

import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import {
  RunnableSequence,
  RunnablePassthrough,
} from "@langchain/core/runnables";

import * as fs from "fs";
import { MongoClient } from "mongodb";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { GithubRepoLoader } from "@langchain/community/document_loaders/web/github";
import OpenAI from "openai";
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";

import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";

const openai = new OpenAI({
  apiKey: process.env.apiKey,
  baseURL: "https://api.upstage.ai/v1/solar",
});

let ATLAS_CONNECTION_STRING = process.env.ATLAS_CONNECTION_STRING;
const client = new MongoClient(ATLAS_CONNECTION_STRING);

export async function VectorizeDatabase(repo: string) {
  console.log("connecting to mongo");
  await client.connect();

  console.log("run me called");
  const loader = new GithubRepoLoader(repo, {
    branch: "main",
    recursive: true,
    unknown: "warn",
  });
  const db = client.db("Research");
  const collection = db.collection("Repo");

  const dbConfig = {
    collection: collection,
    indexName: "default", // The name of the Atlas search index to use.
    textKey: "text", // Field name for the raw text content. Defaults to "text".
    embeddingKey: "plot_embedding", // Field name for the vector embeddings. Defaults to "embedding".
  };
  await collection.deleteMany({});

  const data = await loader.load();

  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
  });

  const docs = await textSplitter.splitDocuments(data);

  console.log(docs, "docs");
  const vectorStore = await MongoDBAtlasVectorSearch.fromDocuments(
    docs,
    new OpenAIEmbeddings(),
    dbConfig
  );

  await client.close();

  return { res: true };
}

export async function GetResults(question: string, coll_index: string) {
  await client.connect();

  const db = client.db("Research");
  const collection = db.collection(coll_index);

  const vectorStore = new MongoDBAtlasVectorSearch(new OpenAIEmbeddings(), {
    collection,
    indexName: "default", // The name of the Atlas search index. Defaults to "default"
    textKey: "text", // The name of the collection field containing the raw content. Defaults to "text"
    embeddingKey: "plot_embedding", // The name of the collection field containing the embedded text. Defaults to "embedding"
  });

  // Implement RAG to answer questions on your data
  const retriever = vectorStore.asRetriever();
  const prompt =
    PromptTemplate.fromTemplate(`Answer the question based on the following context:
  {context}

  Question: {question}`);

  const model = new ChatOpenAI({});
  const chain = RunnableSequence.from([
    {
      context: retriever.pipe(formatDocumentsAsString),
      question: new RunnablePassthrough(),
    },
    prompt,
    model,
    new StringOutputParser(),
  ]);

  // Prompt the LLM

  const answer = await chain.invoke(question);
  console.log("Question: " + question);
  console.log("Answer: " + answer);

  // Return source documents
  const retrievedResults = await retriever.getRelevantDocuments(question);

  await client.close();
  return answer;
}
