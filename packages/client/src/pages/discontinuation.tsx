export default function Discontinuation() {
  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="bg-gray-100 shadow px-4 sm:px-8 py-8 rounded-lg">
        <div className="text-2xl font-bold mb-8 text-center">Discontinuation letter</div>
        Ever since we started this project, our vision for the future of note taking was threefold:
        <ul className="list-disc list-inside mt-2 ml-2">
          <li>
            <b>Space efficiency.</b> No more useless and distracting bars. Use 100% of your screen
          </li>
          <li>
            <b>Time efficiency.</b> Change colors and tools flawlessly and efficiently
          </li>
          <li>
            <b>Cross platform compatibility.</b> Use our app regardless of your operating system, see your notes on any
            other device.
          </li>
        </ul>
        <p className="mt-4 flex">
          With the first two points, we believe we have made great progress, especially with the introduction of the
          floating toolbar. However, it is in trying to achieve the third point that we have run into a wall. We have
          chosen to develop our app using web technologies, which allows us to make it available on any device, even as
          an installable offline app using the PWA standard.
          <br />
          <br />
          However, this comes at a cost: performance. For a long time, we believed that we could overcome this issue and
          reach the same performance as a native app using the right optimizations. However, lately we have come to the
          conclusion that this is not possible. We have come a very long way, and the app feels very smooth and
          responsive. However, there appears to be a very small but significant gap in performance between native and
          web apps. This gap is about 10-20ms, which is not noticeable in most applications, but is very noticeable in a
          note taking app, where it can make the ink feel much less fluid and responsive.
          <br />
          <br />
          After countless hours spent optimizing every single line of code, we are convinced that it is impossible to
          close this gap in performance (at least of the current state of web technologies). Presented with this fact,
          we had 3 options to move forward:
        </p>
        <ul className="list-disc list-inside mt-2 ml-2">
          <li>
            <b>Continue developing the app as a web app.</b> This would mean that our app would never feel as smooth as
            the native alternatives, and would always be at a great disadvantage, making it impossible to compete with
            established note taking apps.
          </li>
          <li>
            <b>Develop a native app.</b> This would mean giving up on our vision of a cross platform app. Then our only
            differentiating factor would be the floating toolbar, which might not be enough to make our app stand out.
            Moreover, which platform should we develop for? Windows? iOS? Android? Both of us are Windows users, but
            Windows is also the platform with the least amount of users. It is also the platform with smallest gap
            between native and web apps, so it would be the least beneficial to develop for.
          </li>
          <li>
            <b>Develop native apps for all platforms at the same time.</b> This would be the ideal solution, but it
            would require a lot more development effort, making it impossible to add all the features we want to add.
          </li>
        </ul>
        <p className="mt-4">
          After a lot of thought, we believe that none of these options are viable. We have therefore made the difficult
          decision to discontinue the development of Inck. We are very sorry to have to make this decision, but we
          believe it is the right one. We would like to thank everyone who has supported us in this journey, and we hope
          that you will understand our decision. The app will be shut down on the 1st of October, 2023.
        </p>
        <p className="mt-4">
          We are extremely sorry, but very grateful for your support in this project. Thank you for using Inck!
        </p>
        <p className="mt-16 text-right">
          Tiberiu
          <br />
          (developer of Inck)
        </p>
      </div>
    </div>
  );
}
