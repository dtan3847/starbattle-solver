import { Container, Typography, Box, Link } from '@mui/material';

const AboutPage = () => {
    return (
        <Container>
            <Typography variant="h2" gutterBottom>
                About StarBattle Solver
            </Typography>

            <Typography variant="body1" gutterBottom>
                StarBattle Solver is a tool designed to assist in solving StarBattle puzzles.
            </Typography>

            <Box marginTop={4}>
                <Typography variant="h4">What are StarBattle Puzzles?</Typography>
                <Typography variant="body1" gutterBottom>
                    StarBattle is a logic puzzle where the goal is to place stars in a grid based on 
                    specific rules. Each row, column, and region in the grid must contain a certain 
                    number of stars (e.g., one star in a 1-star puzzle, two stars in a 2-star puzzle). 
                    Stars cannot touch each other, not even diagonally. The challenge and complexity 
                    increase with the number of stars to be placed. These puzzles require logical 
                    thinking, pattern recognition, and sometimes a bit of trial and error to solve.
                </Typography>
            </Box>

            <Box marginTop={4}>
                <Typography variant="h4">Features:</Typography>
                <ul>
                    <li>Interactive puzzle board</li>
                    <li>Automatic puzzle solving</li>
                    <li>User-guided puzzle solving</li>
                    <li>Support for various puzzle sizes and difficulties</li>
                </ul>
            </Box>

            <Box marginTop={4}>
                <Typography variant="h4">Contact Us</Typography>
                <Typography variant="body1">
                    For more information, suggestions, or feedback, please contact us at 
                    <Link href="mailto:TODO@TODO"> TODO@TODO</Link>.
                </Typography>
            </Box>
        </Container>
    );
};

export default AboutPage;