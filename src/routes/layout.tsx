import React from 'react';
import { AppBar, Toolbar, Typography, Tabs, Tab, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const navigate = useNavigate();
    const [selectedTab, setSelectedTab] = React.useState(0);

    const handleTabChange = (event: React.ChangeEvent<{}>, newValue: number) => {
        setSelectedTab(newValue);

        switch (newValue) {
            case 0:
                navigate('/');
                break;
            case 1:
                navigate('/about');
                break;
            default:
                break;
        }
    };

    return (
        <Box sx={{ flexGrow: 1 }}>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1, textAlign: 'left' }}>
                        StarBattle Solver
                    </Typography>
                    <Tabs
                        value={selectedTab}
                        onChange={handleTabChange}
                        aria-label="navigation tabs"
                        textColor="inherit"
                    >
                        <Tab label="Solve" />
                        <Tab label="About" />
                    </Tabs>
                </Toolbar>
            </AppBar>
            <Box sx={{ marginY: 6 }}>
                {children}
            </Box>
        </Box>
    );
};

export default Layout;