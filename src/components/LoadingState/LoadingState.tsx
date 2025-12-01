import React from "react";

interface LoadingStateProps {
	isLoading: boolean;
}

const LoadingState: React.FC<LoadingStateProps> = ({ isLoading }) => {
	if (!isLoading) return null;

	return (
		<div
			style={{
				textAlign: "center",
				padding: "20px",
			}}
		>
			<div>Uploading and processing file...</div>
		</div>
	);
};

export default LoadingState;
