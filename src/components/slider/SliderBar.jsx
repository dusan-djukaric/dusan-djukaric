import React from "react";
import styled from "styled-components";

function SliderBar(props) {
  const { img } = props.item;
  return (
    <Container className="project">
      <img src={img} alt="project" />
    </Container>
  );
}

export default SliderBar;

const Container = styled.div`
  height: 20rem;
  margin: 0 0.5rem;
  padding: 0.1rem;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    transition: transform 400ms ease-in-out;
  }
  :hover > img {
    transform: scale(1.3);
  }
`;
