import React from "react";

function YouTube({ videoIds = [] }) {

  return (
    <div className="flex flex-wrap justify-around lg:px-0 md:px-8 sm:px-0 gap-10 items-center">
      {videoIds.map((id) => (
        <div key={id} className="relative">
          <iframe
            className="rounded-xl w-[310px] h-[175px]"
            src={`https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&fs=1&cc_load_policy=1`}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            title={`YouTube video ${id}`}
            loading="lazy"
          />
        </div>
      ))}
    </div>
  );
}

export default YouTube;
