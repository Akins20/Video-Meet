import { FC } from "react";

const LoadingSpinner: FC = () => {
    return (
        <div className="flex justify-center items-center p-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent border-blue-600"></div>
        </div>
    );
};

export default LoadingSpinner;
