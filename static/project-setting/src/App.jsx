import { useEffect, useState } from 'react'
import './App.css'
import { AppContext } from './Context';
import { view } from '@forge/bridge'
import { token, setGlobalTheme } from '@atlaskit/tokens';
import ProjectSetting from './modules/ProjectSetting'
import IssueView from './modules/IssueView';
import Loader from './components/Loader';

function App() {
  const [context, setContext] = useState({});
  const [isDetectingContext, setDetectingContext] = useState(true);

  

  useEffect(async () => {
    await view.theme.enable();

    setGlobalTheme({});

    await view
      .getContext()
      .then( context => {
      console.log('context: ', context)
      setContext(context)
    }).catch(error=> {
      console.error('Error fetching context:', error);
      } 
    ).finally(() => {
      setDetectingContext(false);
    })
  }, []);

  function renderContent(moduleKey) {
    switch (moduleKey) {
      case 'project-setting':
        return <ProjectSetting />;
      case 'issue-view':
        return <IssueView />;
      default:
        return <div>Failed to fetch Context</div>;
    }
  }

  if (isDetectingContext) {
    return <Loader />;
  }

  return (
    <AppContext.Provider value={context}>
      {renderContent(context.moduleKey)}
    </AppContext.Provider>
  );
}

export default App
