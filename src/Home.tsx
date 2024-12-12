import { useEffect, useState } from 'react';
import { $Objects, $Actions, $Queries, generateQuestionsFromFileContains, SemanticExDocument } from "@legal-document-analysis/sdk";
import { Osdk, PageResult, Result  } from "@osdk/client";
import css from "./Home.module.css";
import Layout from "./Layout";
import client from "./lib/client";

function Home() {
  const objectApiNames = Object.keys($Objects);
  const actionApiNames = Object.keys($Actions);
  const queryApiNames = Object.keys($Queries);
  console.log('hi');

  const [paths, setPaths] = useState<string[]>([])

  const getDocuments = async () => {
    
    console.log('getDocuments');
    const response:  Result<PageResult<Osdk.Instance<SemanticExDocument>>>
      = await client(SemanticExDocument).fetchPageWithErrors({ $pageSize: 30 });
    if (response.value?.data) {
      const pathsOnly = response.value?.data.map(m => m.path ?? '').filter(Boolean);
      setPaths(pathsOnly);
    }
};

  const callFunction = async () => {
    console.log('callFunction');
    const result = await client(generateQuestionsFromFileContains).executeFunction({
      "filename_contains": "20230918-APM-BT5-PM-PUBLIC-Google.pdf"
    });
    console.log(result);
  };
  useEffect(() => {
    getDocuments();
    callFunction();
  }, []);

  return (
    <Layout>
      <h1>@legal-document-analysis/sdk</h1>
      <p>
        Welcome to your Ontology SDK! Try using any of the following methods
        now.
      </p>
      <div className={css.methods}>
        <div>
          <h2>Objects ({objectApiNames.length})</h2>
          {objectApiNames.map((objectApiName) => (
            <pre key={objectApiName}>
              $Objects.{objectApiName}
            </pre>
          ))}
        </div>
        <div>
          <h2>Actions ({actionApiNames.length})</h2>
          {actionApiNames.map((actionApiName) => (
            <pre key={actionApiName}>
              $Actions.{actionApiName}
            </pre>
          ))}
        </div>
        <div>
          <h2>Queries ({queryApiNames.length})</h2>
          {queryApiNames.map((queryApiName) => (
            <pre key={queryApiName}>
              $Queries.{queryApiName}
            </pre>
          ))}
        </div>
        <div>
          <h2>Files</h2>
          <ul>
          {paths.map((p) => (
            <li key={p}>{p}</li>
          ))}
          </ul>
        </div>
      </div>
    </Layout>
  );
}

export default Home;
