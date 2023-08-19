import React from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import logo from './logo.svg';
import './App.css';

import StarBattlePuzzle from './starbattle/puzzle';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div className="App">
        <header className="App-header">
          <StarBattlePuzzle />
        </header>
      </div>
    </ThemeProvider>
  );
}

export default App;
