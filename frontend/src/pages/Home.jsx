export default function Home({ page = null }) {
  const content = {
    about: {
      title: 'About us',
      text: 'FoodConnect helps redirect fresh surplus food from restaurants, catering services and individuals to people who need it.'
    },
    mission: {
      title: 'Our mission',
      text: 'We work to reduce food waste, alleviate hunger and build stronger communities.'
    },
    contact: {
      title: 'Contact us',
      text: 'For concerns or feedback, email aanchalkanwar25@gmail.com.'
    }
  };

  const pageData = content[page];

  return (
    <div className="page-card">
      {pageData ? (
        <>
          <h1>{pageData.title}</h1>
          <p>{pageData.text}</p>
        </>
      ) : (
        <div>
          <h1>Welcome to FoodConnect</h1>
          <p>Donors, agents, and admins can manage food donations using a modern React frontend.</p>
        </div>
      )}
    </div>
  );
}
