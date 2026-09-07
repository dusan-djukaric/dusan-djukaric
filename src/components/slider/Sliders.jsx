import SliderComp from "./Slider";
import React from "react";
import styled from "styled-components";

function Sliders() {
  return (
    <Container id="project">
      <Slide>
        <SliderComp />
      </Slide>
    </Container>
  );
};

export default Sliders;

const Container = styled.div`
  width: 80%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 3rem 0;
  position: relative;
  @media (max-width: 840px) {
    width: 90%;
  }
`;

const Slide = styled.div``;
