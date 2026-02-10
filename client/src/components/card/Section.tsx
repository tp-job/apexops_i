import type { FC } from "react";
import ToolCard from "./SectionCard.tsx";

const Section: FC = () => {
    return (
        // <div id={id} className="mb-20 px-4 md:px-8">
        <div className="mb-20 px-4 md:px-8">
            {/* title */}
            <h2 className="text-3xl font-bold text-deep-night mb-8 inline-block pb-1">title</h2>
            {/* content */}
            <div className="flex flex-wrap gap-6">
                {/* {tools?.map((tool) => (
                    <div key={tool.title} className="w-[200px]">
                        <ToolCard {...tool} />
                    </div>
                ))} */}
                    <div className="w-[200px]">
                        <ToolCard />
                        <ToolCard />
                        <ToolCard />
                        <ToolCard />
                    </div>
            </div>
        </div>
    );
}

export default Section;